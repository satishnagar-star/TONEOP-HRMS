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
      const { documents } = req.body;

      if (!documents || !Array.isArray(documents) || documents.length === 0) {
        return res.status(400).json({ success: false, error: "No documents provided for insertion." });
      }

      // 1. Column Validation (Strict)
      const headers = Object.keys(documents[0]);
      const missingHeaders = validateHeaders(headers);
      if (missingHeaders.length > 0) {
        return res.status(400).json({ success: false, error: "Invalid CSV structure", missing: missingHeaders });
      }

      const total_rows = documents.length;
      let inserted_rows = 0;
      const errors = [];

      // 2. Row-Level Validation & Grouping
      const groupedPunches = {}; // { emp_code: { date: [punches] } }

      documents.forEach((doc, idx) => {
        const rowNum = idx + 1;
        try {
          const validation = validateRow(doc, rowNum);

          if (!validation.isValid) {
            const enhanced = validation.errors.map(e => ({ ...e, original_row: doc }));
            errors.push(...enhanced);
          } else {
            const { emp_code, month_str } = validation.data;
            if (!groupedPunches[emp_code]) groupedPunches[emp_code] = {};
            if (!groupedPunches[emp_code][month_str]) groupedPunches[emp_code][month_str] = [];
            groupedPunches[emp_code][month_str].push(validation.data);
          }
        } catch (rowErr) {
          errors.push({ row_number: rowNum, reason: "Parsing Error: " + rowErr.message, original_row: doc });
        }
      });

      // 3. Punch Consolidation & Attendance Calculation
      const holidays = await Holiday.find().lean();
      const users = await User.find().lean();
      const userMap = users.reduce((acc, u) => { acc[u.emp_code] = u; return acc; }, {});

      const processedRecordsByGroup = {}; // emp_code -> month -> records[]
      const consolidatedBy = {}; // help track original rows for duplicates

      for (const emp_code in groupedPunches) {
        for (const month_str in groupedPunches[emp_code]) {
          const dailyRows = groupedPunches[emp_code][month_str];
          // Group by date_str again to process day-by-day
          const byDay = dailyRows.reduce((acc, row) => {
            if (!acc[row.date_str]) acc[row.date_str] = [];
            acc[row.date_str].push(row);
            return acc;
          }, {});

          if (!processedRecordsByGroup[emp_code]) processedRecordsByGroup[emp_code] = {};
          if (!processedRecordsByGroup[emp_code][month_str]) processedRecordsByGroup[emp_code][month_str] = [];

          for (const date_str in byDay) {
            try {
              const group = byDay[date_str];
              const record = processAttendance(group, holidays, userMap[emp_code]);

              const finalRecord = {
                date: record.date, // DD/MM/YYYY
                time_in: record.time_in,
                time_out: record.time_out,
                late_minute: record.late_minute,
                status: record.status,
                shift: record.shift
              };

              processedRecordsByGroup[emp_code][month_str].push(finalRecord);
              consolidatedBy[`${emp_code}_${record.date}`] = group[0].original_row;
            } catch (calcErr) {
              errors.push({
                row_number: "N/A",
                reason: `Calculation Error for ${emp_code} on ${date_str}: ${calcErr.message}`,
                original_row: byDay[date_str][0].original_row
              });
            }
          }
        }
      }

      // 4. Comprehensive Sync with Auto-Marking
      const syncDates = [...new Set(Object.values(consolidatedBy).map(r => r.date_str))];
      const empCodes = Object.keys(userMap);
      
      const bulkOps = [];

      for (const date_str of syncDates) {
        const dateObj = parse(date_str, "dd/MM/yyyy", new Date());
        const month_str = format(dateObj, "yyyy-MM");

        for (const emp_code of empCodes) {
          let user = userMap[emp_code];
          
          // Apply HR Policies (Accruals, resets) before processing
          user = await applyHRPolicies(user);
          userMap[emp_code] = user; 
          
          // Check if record already exists for this specific day to avoid double-processing
          const existingDoc = existingMap[`${emp_code}_${month_str}`];
          const isExisting = existingDoc?.records?.some(r => r.date === date_str);
          
          if (isExisting) continue;

          let finalRecord;
          const punchKey = `${emp_code}_${date_str}`;
          const punches = groupedPunches[emp_code]?.[month_str]?.filter(p => p.date_str === date_str);

          if (punches && punches.length > 0) {
            // CASE A: User has punches in CSV
            const record = processAttendance(punches, holidays, user);
            
            // Adjust balances based on punch result
            if (record.plus_one_leave) {
              await User.updateOne({ emp_code }, { $inc: { leave_balance: 1 } });
              user.leave_balance += 1;
            }
            if (record.late_minute > 0) {
              await User.updateOne({ emp_code }, { $inc: { total_late_minutes: -record.late_minute } });
              user.total_late_minutes -= record.late_minute;
            }

            finalRecord = {
              date: record.date,
              time_in: record.time_in,
              time_out: record.time_out,
              late_minute: record.late_minute,
              status: record.status,
              shift: record.shift,
              balance_leave: user.leave_balance,
              balance_late_minutes: user.total_late_minutes
            };
            inserted_rows++;
          } else {
            // CASE B: User MISSING from CSV for this date -> AUTO-MARK
            // Virtual processing
            const virtualGroup = [{
              emp_code: user.emp_code,
              employee_name: user.name,
              date_obj: dateObj,
              date_str: date_str,
              month_str: month_str,
              shift: user.shift || "[09:00-18:00][01:00]",
              status: "MISSING_PUNCH"
            }];
            
            const record = processAttendance(virtualGroup, holidays, user);

            // SPECIAL BUSINESS LOGIC: Absent -> Leave if balance > 0
            if (record.status === "Absent") {
              if (user.leave_balance > 0) {
                record.status = "Leave";
                await User.updateOne({ emp_code }, { $inc: { leave_balance: -1 } });
                user.leave_balance -= 1;
              }
            }

            finalRecord = {
              date: record.date,
              time_in: null,
              time_out: null,
              late_minute: 0,
              status: record.status,
              shift: record.shift,
              balance_leave: user.leave_balance,
              balance_late_minutes: user.total_late_minutes
            };
            // Note: Auto-marked rows are technically "inserted"/reconciled
            inserted_rows++;
          }

          // Add to Bulk Ops
          bulkOps.push({
            updateOne: {
              filter: { employee_code: emp_code, Date: month_str },
              update: {
                $setOnInsert: { employee_name: user.name },
                $push: { records: finalRecord }
              },
              upsert: true
            }
          });
        }
      }

      return res.status(200).json({
        success: true,
        total_rows,
        inserted_rows,
        rejected_rows: total_rows - inserted_rows,
        errors
      });
    } catch (fatalErr) {
      console.error("FATAL UPLOAD ERROR:", fatalErr);
      return res.status(500).json({
        success: false,
        error: "Internal Server Error",
        message: fatalErr.message,
        stack: fatalErr.stack
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
