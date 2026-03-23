import Joi from "joi";
import { asyncHandler } from "../utils/asyncHandler.js";
import { store } from "../services/dataStore.js";
import { Attendance } from "../models/Attendance.js";
import { Holiday } from "../models/Holiday.js";
import { User } from "../models/User.js";
import { format, parse } from "date-fns";
import { validateHeaders, validateRow, processAttendance } from "../utils/attendanceUtils.js";
import { applyHRPolicies } from "../utils/leavePolicyUtils.js";

const monthSchema = Joi.string()
  .pattern(/^\d{4}-\d{2}$/)
  .required();

function currentMonth() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${m}`;
}

export const attendanceController = {
  getByEmployee: asyncHandler(async (req, res) => {
    const employeeCode = req.params.employeeCode.toUpperCase();
    const month = req.query.month ?? currentMonth();
    const { error } = monthSchema.validate(month);
    if (error) return res.status(400).json({ success: false, message: "Invalid month. Use YYYY-MM." });

    const requester = req.user;
    if (requester.role === "User" && requester.code !== employeeCode) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const employee = (await store.getEmployees()).find((e) => e.code === employeeCode);

    if (requester.role === "Admin") {
      if (employee && employee.department !== requester.department) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }
    }

    const doc = await Attendance.findOne({ employee_code: employeeCode, Date: month }).lean();

    // Map to the format expected by AttendancePage.jsx (in, out, late)
    const attendance = doc?.records?.map(r => ({
      ...r,
      in: r.time_in,
      out: r.time_out,
      late: r.late_minute,
      employee_name: doc.employee_name,
      emp_code: doc.employee_code,
      month: doc.Date
    })) || [];

    return res.json({
      success: true,
      employee: employee ?? { code: employeeCode, month },
      attendance,
    });
  }),

  getAll: asyncHandler(async (req, res) => {
    let { date, month, department } = req.query;

    if (req.user.role !== "SuperAdmin") return res.status(403).json({ success: false, message: "Forbidden" });

    // Handle Default Date Logic if neither date nor month is provided
    if (!date && !month) {
      const today = format(new Date(), "dd/MM/yyyy");
      const existsToday = await Attendance.findOne({ "records.date": today }).limit(1).lean();

      if (existsToday) {
        date = today;
      } else {
        const latestMonthDoc = await Attendance.findOne().sort({ Date: -1 }).lean();
        if (latestMonthDoc && latestMonthDoc.records.length > 0) {
          const sorted = [...latestMonthDoc.records].sort((a, b) => {
            const da = parse(a.date, "dd/MM/yyyy", new Date());
            const db = parse(b.date, "dd/MM/yyyy", new Date());
            return db - da;
          });
          date = sorted[0].date;
        } else {
          date = today;
        }
      }
    }

    const query = {};
    if (date) {
      query["records.date"] = date;
    } else if (month) {
      query["Date"] = month;
    }

    const docs = await Attendance.find(query).lean();
    let flattened = [];
    docs.forEach(doc => {
      const records = date
        ? doc.records.filter(r => r.date === date)
        : doc.records;

      records.forEach(r => {
        flattened.push({
          _id: r._id,
          employee_code: doc.employee_code,
          employee_name: doc.employee_name,
          date: r.date,
          time_in: r.time_in,
          time_out: r.time_out,
          late_minute: r.late_minute,
          status: r.status,
          shift: r.shift,
          balance_leave: r.balance_leave || 0,
          balance_late_minutes: r.balance_late_minutes || 0
        });
      });
    });

    if (department) {
      const employees = await store.getEmployees();
      const codesInDept = employees.filter(e => e.department === department).map(e => e.code);
      flattened = flattened.filter(f => codesInDept.includes(f.employee_code));
    }

    // Sort by date and time descending
    flattened.sort((a, b) => {
      const da = parse(`${a.date} ${a.time_in || "00:00"}`, "dd/MM/yyyy HH:mm", new Date());
      const db = parse(`${b.date} ${b.time_in || "00:00"}`, "dd/MM/yyyy HH:mm", new Date());
      return db - da;
    });

    return res.json({ success: true, count: flattened.length, date: date || month, results: flattened });
  }),

  getDepartment: asyncHandler(async (req, res) => {
    const dept = req.params.dept;
    const month = req.query.month ?? currentMonth();
    const { error } = monthSchema.validate(month);
    if (error) return res.status(400).json({ success: false, message: "Invalid month. Use YYYY-MM." });

    const requester = req.user;
    if (requester.role === "User") return res.status(403).json({ success: false, message: "Forbidden" });
    if (requester.role === "Admin" && requester.department !== dept) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const docs = await Attendance.find({ Date: month }).lean();
    const employeeMap = docs.reduce((acc, doc) => {
      acc[doc.employee_code] = doc.records.map(r => ({ ...r, employee_name: doc.employee_name, emp_code: doc.employee_code, month: doc.Date }));
      return acc;
    }, {});

    const employees = (await store.getEmployees()).filter((e) => e.department === dept);
    const results = employees.map(e => ({
      code: e.code,
      month,
      data: { success: true, records: employeeMap[e.code] || [] }
    }));

    return res.json({ success: true, department: dept, month, count: results.length, results });
  }),

  uploadCsvData: asyncHandler(async (req, res) => {
    try {
      const { documents, dryRun } = req.body;

      if (!documents || !Array.isArray(documents) || documents.length === 0) {
        return res.status(400).json({ success: false, error: "No documents provided for insertion." });
      }

      // 1. Header Validation
      const headers = Object.keys(documents[0]);
      const missingHeaders = validateHeaders(headers);
      if (missingHeaders.length > 0) {
        return res.status(400).json({ success: false, error: "Invalid CSV structure", missing: missingHeaders });
      }

      const total_rows = documents.length;
      let inserted_rows = 0;
      let rejected_rows = 0;
      const errors = [];

      // 2. Row Validation & Grouping
      const groupedByEmp = {}; // { emp_code: [valid_data_objs] }
      const datesFound = new Set();

      documents.forEach((doc, idx) => {
        const rowNum = idx + 1;
        try {
          const validation = validateRow(doc, rowNum);
          if (!validation.isValid) {
            errors.push({ ...validation.errors[0], original_row: doc });
            rejected_rows++;
          } else {
            const data = validation.data;
            if (!groupedByEmp[data.emp_code]) groupedByEmp[data.emp_code] = [];
            groupedByEmp[data.emp_code].push(data);
            datesFound.add(data.date_str);
          }
        } catch (err) {
          errors.push({ row_number: rowNum, reason: `Error: ${err.message}`, original_row: doc });
          rejected_rows++;
        }
      });

      // 3. Preparation for Stats and Formatting
      const allEmployees = await User.find({ role: "User" }).lean();
      const empCodes = allEmployees.map(e => e.emp_code.toUpperCase());
      const sortedDates = [...datesFound].sort((a, b) => {
        const da = parse(a, "dd/MM/yyyy", new Date());
        const db = parse(b, "dd/MM/yyyy", new Date());
        return da - db;
      });

      const ready_rows = total_rows - rejected_rows;
      console.log(`Processing Sync: total=${total_rows}, ready=${ready_rows}, dryRun=${dryRun}`);

      // 4. If not dryRun, perform Sync
      if (!dryRun) {
        const bulkOps = [];
        
        // Combine DB employees and CSV employees to ensure we miss no one
        const dbEmployees = await User.find({ role: { $in: ["User", "Admin"] } }).lean();
        const dbEmpCodes = dbEmployees.map(e => e.emp_code.toUpperCase());
        const csvEmpCodes = Object.keys(groupedByEmp);
        
        const allTargetCodes = Array.from(new Set([...dbEmpCodes, ...csvEmpCodes]));
        
        console.log(`Grouping data for ${allTargetCodes.length} target employees (DB: ${dbEmpCodes.length}, CSV: ${csvEmpCodes.length})...`);
        
        for (const empCode of allTargetCodes) {
          const empPunches = groupedByEmp[empCode] || [];
          const punchesByDate = empPunches.reduce((acc, p) => {
            if (!acc[p.date_str]) acc[p.date_str] = [];
            acc[p.date_str].push(p);
            return acc;
          }, {});

          const employee = dbEmployees.find(e => e.emp_code.toUpperCase() === empCode);
          const monthlyRecords = {};

          for (const date_str of sortedDates) {
            try {
              const dateObj = parse(date_str, "dd/MM/yyyy", new Date());
              const month_str = format(dateObj, "yyyy-MM");

              if (!monthlyRecords[month_str]) monthlyRecords[month_str] = [];

              const dayPunches = punchesByDate[date_str];
              let finalRecord;

              if (dayPunches && dayPunches.length > 0) {
                const record = processAttendance(dayPunches);
                finalRecord = {
                  date: record.date,
                  time_in: record.time_in,
                  time_out: record.time_out,
                  late_minute: record.late_minute,
                  status: record.status,
                  shift: record.shift
                };
              } else {
                // Not in CSV for this specific date
                finalRecord = {
                  date: date_str,
                  time_in: null,
                  time_out: null,
                  late_minute: 0,
                  status: "Absent",
                  shift: employee?.shift || "[10:00-19:00][09:00]"
                };
              }
              monthlyRecords[month_str].push(finalRecord);
            } catch (err) {
              console.error(`Error processing date ${date_str} for ${empCode}:`, err.message);
            }
          }

          // Important: Get name from punches if employee not in DB
          const empName = employee?.name || (empPunches[0]?.employee_name) || "Unknown";

          for (const [month_str, records] of Object.entries(monthlyRecords)) {
            bulkOps.push({
              updateOne: {
                filter: { employee_code: empCode, Date: month_str },
                update: {
                  $set: { 
                    employee_name: empName,
                    records: records
                  }
                },
                upsert: true
              }
            });
          }
        }

        console.log(`Total Bulk Operations: ${bulkOps.length}`);
        if (bulkOps.length > 0) {
          try {
            const bulkResult = await Attendance.bulkWrite(bulkOps);
            console.log(`Bulk sync finished: upserted=${bulkResult.upsertedCount}, modified=${bulkResult.modifiedCount}`);
          } catch (bulkErr) {
            console.error("BULK WRITE ERROR:", bulkErr);
            throw bulkErr;
          }
        }
      }

      return res.status(200).json({
        success: true,
        isDryRun: !!dryRun,
        total_rows,
        ready_rows,
        inserted_rows: dryRun ? 0 : ready_rows,
        rejected_rows,
        errors
      });
    } catch (fatalErr) {
      console.error("FATAL UPLOAD ERROR:", fatalErr);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error",
        message: fatalErr.message
      });
    }
  }),

  updateRecord: asyncHandler(async (req, res) => {
    const { id } = req.params; // Internal record ID (_id)
    const updateData = req.body;

    // Find the monthly doc containing this record and update it using positional operator $
    const doc = await Attendance.findOneAndUpdate(
      { "records._id": id },
      { $set: { "records.$": { ...updateData, _id: id } } },
      { new: true }
    );

    if (!doc) return res.status(404).json({ success: false, message: "Record not found" });

    res.json({ success: true, record: doc.records.id(id) });
  }),
};
