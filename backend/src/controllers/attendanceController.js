import Joi from "joi";
import { asyncHandler } from "../utils/asyncHandler.js";
import { store } from "../services/dataStore.js";
import { Attendance } from "../models/Attendance.js";

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
    const employeeCode = req.params.employeeCode;
    const month = req.query.month ?? currentMonth();
    const { error } = monthSchema.validate(month);
    if (error) return res.status(400).json({ success: false, message: "Invalid month. Use YYYY-MM." });

    const requester = req.user;
    if (requester.role === "User" && requester.code !== employeeCode) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    // Find employee info from users
    const employees = await store.getEmployees();
    const employee = employees.find((e) => e.code === employeeCode);

    if (requester.role === "Admin") {
      if (employee && employee.department !== requester.department) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }
    }

    const records = await Attendance.find({ emp_code: employeeCode.toUpperCase(), month }).lean();

    return res.json({
      success: true,
      employee: employee ?? { code: employeeCode, month },
      records,
    });
  }),

  getAll: asyncHandler(async (req, res) => {
    const month = req.query.month ?? currentMonth();
    const { error } = monthSchema.validate(month);
    if (error) return res.status(400).json({ success: false, message: "Invalid month. Use YYYY-MM." });

    const requester = req.user;
    if (requester.role !== "SuperAdmin") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const employees = await store.getEmployees();
    const results = await Promise.all(
      employees.map(async (e) => ({
        code: e.code,
        month,
        data: {
          success: true,
          records: await Attendance.find({ emp_code: e.code.toUpperCase(), month }).lean(),
        },
      }))
    );

    return res.json({ success: true, month, count: results.length, results });
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

    const employees = (await store.getEmployees()).filter((e) => e.department === dept);
    const results = await Promise.all(
      employees.map(async (e) => ({
        code: e.code,
        month,
        data: {
          success: true,
          records: await Attendance.find({ emp_code: e.code.toUpperCase(), month }).lean(),
        },
      }))
    );

    return res.json({ success: true, department: dept, month, count: results.length, results });
  }),

  uploadCsvData: asyncHandler(async (req, res) => {
    const { documents } = req.body;

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({ success: false, error: "No documents provided for insertion." });
    }

    try {
      const result = await Attendance.insertMany(documents, { ordered: false });
      return res.status(200).json({
        success: true,
        message: `Successfully inserted ${result.length} records.`,
        insertedCount: result.length,
      });
    } catch (err) {
      console.error("Error inserting attendance into MongoDB:", err.message);
      return res.status(500).json({ success: false, error: "Insert failed", details: err.message });
    }
  }),
};
