import Joi from "joi";
import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Attendance } from "../models/Attendance.js";
import { Holiday } from "../models/Holiday.js";
import { User } from "../models/User.js";
import { format, parse } from "date-fns";
import { validateHeaders, validateRow, processAttendance } from "../utils/attendanceUtils.js";
import { ensureUserBalances } from "../utils/hrCoreLogic.js";

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
    // Check permissions
    if (requester.role === "User" && requester.emp_code?.toUpperCase() !== employeeCode) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const employee = await User.findOne({ emp_code: employeeCode });
    if (requester.role === "Admin" && employee?.department !== requester.department) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const doc = await Attendance.findOne({ employee_code: employeeCode, Date: month }).lean();

    const attendance = doc?.records?.map(r => ({ ...r, late: r.late_minute })) || [];
    const allHolidays = await Holiday.find().lean();
    
    // Calculate Stats for the ENTIRE Month dynamically
    const [year, monthNum] = month.split("-").map(Number);
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const stats = { present: 0, absent: 0, halfday: 0, leave: 0, wfh: 0, holiday: 0, weekoff: 0, late_minutes: 0, shortleave: 0 };
    
    const recordsMap = attendance.reduce((acc, r) => {
      acc[r.date] = r;
      return acc;
    }, {});

    const now = new Date();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${String(d).padStart(2, "0")}/${String(monthNum).padStart(2, "0")}/${year}`;
      const record = recordsMap[dateStr];
      
      const dateObj = parse(dateStr, "dd/MM/yyyy", new Date());
      const dayName = format(dateObj, "EEEE");
      const isSunday = dayName === "Sunday";
      const isSaturday = dayName === "Saturday";
      const dept = (employee?.department || "").toUpperCase();
      const isWeekOff = isSunday || (dept === "IT" && isSaturday);
      
      const isHoliday = allHolidays.some(h => {
        const hDate = typeof h.date === "string" ? h.date : format(new Date(h.date), "dd/MM/yyyy");
        return hDate === dateStr;
      });

      if (record) {
        let s = record.status;
        
        // If it's recorded as Absent but it's a WeekOff/Holiday, count it correctly for stats
        if (s === "Absent") {
          if (isHoliday) s = "Holiday";
          else if (isWeekOff) s = "WeekOff";
        }

        if (s === "Present") stats.present++;
        else if (s === "Absent") stats.absent++;
        else if (s === "Halfday" || s === "Half Day") stats.halfday++;
        else if (s === "Leave") stats.leave++;
        else if (s === "WFH") stats.wfh++;
        else if (s === "Holiday") stats.holiday++;
        else if (s === "WeekOff" || s === "Week Off") stats.weekoff++;
        else if (s === "Short Leave") stats.shortleave++;
        stats.late_minutes += (record.late_minute || 0);
      } else {
        if (isHoliday) stats.holiday++;
        else if (isWeekOff) stats.weekoff++;
        else if (dateObj <= now) stats.absent++;
      }
    }

    return res.json({
      success: true,
      employee: employee || { emp_code: employeeCode, name: doc?.employee_name || "Unknown" },
      attendance,
      stats: {
        ...stats,
        total_late_minutes: 90 - stats.late_minutes,
        leave_balance: employee?.leave_balance ?? 0
      }
    });
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

    const deptUsers = await User.find({ department: dept, role: { $in: ["User", "Admin"] } }).select('emp_code name').lean();
    const deptCodes = deptUsers.map(u => u.emp_code.toUpperCase());

    const docs = await Attendance.find({ employee_code: { $in: deptCodes }, Date: month }).lean();
    const employeeMap = docs.reduce((acc, doc) => {
      acc[doc.employee_code] = doc.records.map(r => ({ ...r, employee_name: doc.employee_name, emp_code: doc.employee_code, month: doc.Date }));
      return acc;
    }, {});

    const results = deptUsers.map(e => ({
      code: e.emp_code,
      name: e.name,
      month,
      data: { success: true, records: employeeMap[e.emp_code.toUpperCase()] || [] }
    }));

    return res.json({ success: true, department: dept, month, count: results.length, results });
  }),

  uploadCsvData: asyncHandler(async (req, res) => {
    try {
      const { documents, dryRun } = req.body;

      if (!documents || !Array.isArray(documents) || documents.length === 0) {
        return res.status(400).json({ success: false, error: "No documents provided for insertion." });
      }

      const headers = Object.keys(documents[0]);
      const missingHeaders = validateHeaders(headers);
      if (missingHeaders.length > 0) {
        return res.status(400).json({ success: false, error: "Invalid CSV structure", missing: missingHeaders });
      }

      const total_rows = documents.length;
      let rejected_rows = 0;
      const errors = [];
      const groupedByEmp = {}; 
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

      const sortedDates = [...datesFound].sort((a, b) => {
        const da = parse(a, "dd/MM/yyyy", new Date());
        const db = parse(b, "dd/MM/yyyy", new Date());
        return da - db;
      });

      const ready_rows = total_rows - rejected_rows;

      if (!dryRun) {
        const targetGroups = {}; 
        const allHolidays = await Holiday.find().lean();
        const dbEmployees = await User.find({}); 
        const csvEmpCodes = Object.keys(groupedByEmp);
        const allTargetCodes = Array.from(new Set([...dbEmployees.map(e => e.emp_code.toUpperCase()), ...csvEmpCodes]));
        
        for (const empCode of allTargetCodes) {
          const empPunches = groupedByEmp[empCode] || [];
          const punchesByDate = empPunches.reduce((acc, p) => {
            if (!acc[p.date_str]) acc[p.date_str] = [];
            acc[p.date_str].push(p);
            return acc;
          }, {});

          let employee = dbEmployees.find(e => e.emp_code.toUpperCase() === empCode);
          if (!employee && empPunches.length > 0) {
            employee = { emp_code: empCode, name: empPunches[0].employee_name, role: "User", department: "Unknown" };
          }
          if (!employee) continue;

          for (const date_str of sortedDates) {
            const dateObj = parse(date_str, "dd/MM/yyyy", new Date());
            const month_str = format(dateObj, "yyyy-MM");
            const key = `${empCode}_${month_str}`;

            if (!targetGroups[key]) {
              if (employee._id) employee = await ensureUserBalances(employee, date_str);
              targetGroups[key] = { empCode, monthStr: month_str, empName: employee.name, employee, newRecords: [] };
            }

            const dayPunches = punchesByDate[date_str] || [];
            const record = processAttendance(dayPunches, { employee, holidays: allHolidays, date_str });

            if (record.status === "Absent" && employee._id && employee.leave_balance > 0) {
               record.status = "Leave";
               employee.leave_balance -= 1;
               await User.updateOne({ _id: employee._id }, { $inc: { leave_balance: -1 } });
            }

            if (record.late_deducted > 0 && employee._id) {
               employee.total_late_minutes -= record.late_deducted;
               await User.updateOne({ _id: employee._id }, { $inc: { total_late_minutes: -record.late_deducted } });
            }

            if (record.leave_earned > 0 && employee._id) {
               employee.leave_balance += record.leave_earned;
               await User.updateOne({ _id: employee._id }, { $inc: { leave_balance: record.leave_earned } });
            }

            record.balance_leave = employee.leave_balance || 0;
            record.balance_late_minutes = employee.total_late_minutes || 0;
            targetGroups[key].newRecords.push(record);
          }
        }

        const bulkOps = [];
        for (const key of Object.keys(targetGroups)) {
          const { empCode, monthStr, empName, newRecords } = targetGroups[key];
          let doc = await Attendance.findOne({ employee_code: empCode, Date: monthStr });
          if (!doc) {
            doc = new Attendance({ employee_code: empCode, employee_name: empName, Date: monthStr, records: newRecords });
          } else {
            const existingRecords = doc.records || [];
            newRecords.forEach(newR => {
              const idx = existingRecords.findIndex(r => r.date === newR.date);
              if (idx > -1) existingRecords[idx] = { ...existingRecords[idx].toObject(), ...newR };
              else existingRecords.push(newR);
            });
            doc.records = existingRecords;
            doc.employee_name = empName;
          }
          bulkOps.push({
            updateOne: {
              filter: { _id: doc._id || new mongoose.Types.ObjectId() },
              update: { $set: { employee_code: doc.employee_code, employee_name: doc.employee_name, Date: doc.Date, records: doc.records } },
              upsert: true
            }
          });
        }
        if (bulkOps.length > 0) await Attendance.bulkWrite(bulkOps);
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
      return res.status(500).json({ success: false, error: "Internal Server Error", message: fatalErr.message });
    }
  }),

  updateRecord: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    const doc = await Attendance.findOne({ "records._id": id });
    if (!doc) return res.status(404).json({ success: false, message: "Record not found" });

    const record = doc.records.id(id);
    Object.assign(record, updateData);
    await doc.save();

    if (updateData.balance_leave !== undefined || updateData.balance_late_minutes !== undefined) {
      const userUpdate = {};
      if (updateData.balance_leave !== undefined) userUpdate.leave_balance = updateData.balance_leave;
      if (updateData.balance_late_minutes !== undefined) userUpdate.total_late_minutes = updateData.balance_late_minutes;
      await User.updateOne({ emp_code: doc.employee_code.toUpperCase() }, { $set: userUpdate });
    }
    res.json({ success: true, record });
  }),

  getAll: asyncHandler(async (req, res) => {
    const { month, department, employee } = req.query;
    const filter = {};
    if (month) filter.Date = month;
    if (employee) filter.employee_code = employee.toUpperCase();

    let docs = await Attendance.find(filter).lean();
    let allRecords = [];
    docs.forEach(doc => {
      allRecords.push(...doc.records.map(r => ({ ...r, employee_code: doc.employee_code, employee_name: doc.employee_name, month: doc.Date })));
    });

    if (department) {
       const usersInDept = await User.find({ department }).select('emp_code');
       const deptEmpCodes = usersInDept.map(u => u.emp_code.toUpperCase());
       allRecords = allRecords.filter(r => deptEmpCodes.includes(r.employee_code.toUpperCase()));
    }

    allRecords.sort((a, b) => {
      const da = parse(a.date, "dd/MM/yyyy", new Date());
      const db = parse(b.date, "dd/MM/yyyy", new Date());
      return db - da;
    });

    res.json({ success: true, results: allRecords });
  }),
};
