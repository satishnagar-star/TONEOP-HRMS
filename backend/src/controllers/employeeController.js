import Joi from "joi";
import { asyncHandler } from "../utils/asyncHandler.js";
import { store } from "../services/dataStore.js";
import { User } from "../models/User.js";

const createSchema = Joi.object({
  code: Joi.string().trim().min(2).max(32).required(),
  name: Joi.string().trim().min(2).max(100).required(),
  department: Joi.string().trim().min(2).max(100).required(),
  role: Joi.string().valid("User", "Admin", "SuperAdmin").required(),
  password: Joi.string().min(4).max(128).optional(),
});

export const employeeController = {
  create: asyncHandler(async (req, res) => {
    const { value, error } = createSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) return res.status(400).json({ success: false, message: "Invalid input", details: error.details });

    const existing = await User.findOne({ emp_code: value.code.toUpperCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: "Employee already exists" });
    }

    const user = new User({
      emp_code: value.code.toUpperCase(),
      name: value.name,
      department: value.department,
      role: value.role,
      password: value.password ?? value.code.toLowerCase(),
    });
    await user.save();

    await store.appendLog({
      type: "employee.create",
      at: new Date().toISOString(),
      code: value.code,
      by: req.user.code,
    });

    return res.json({ success: true, employee: { code: user.emp_code, name: user.name, department: user.department, role: user.role } });
  }),

  remove: asyncHandler(async (req, res) => {
    const code = req.params.code.toUpperCase();
    const result = await User.deleteOne({ emp_code: code });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    await store.appendLog({
      type: "employee.delete",
      at: new Date().toISOString(),
      code,
      by: req.user.code,
    });

    return res.json({ success: true });
  }),

  update: asyncHandler(async (req, res) => {
    const code = req.params.code.toUpperCase();
    const { name, department, role, password } = req.body;

    const user = await User.findOne({ emp_code: code });
    if (!user) return res.status(404).json({ success: false, message: "Employee not found" });

    if (name) user.name = name;
    if (department) user.department = department;
    if (role) user.role = role;
    if (password) user.password = password;

    await user.save();

    await store.appendLog({
      type: "employee.update",
      at: new Date().toISOString(),
      code,
      by: req.user.code,
    });

    return res.json({ success: true, employee: { code: user.emp_code, name: user.name, department: user.department, role: user.role } });
  }),

  all: asyncHandler(async (req, res) => {
    const employees = await store.getEmployees();
    return res.json({ success: true, employees });
  }),

  department: asyncHandler(async (req, res) => {
    const list = await User.find({ department: req.user.department }).lean();
    const employees = list.map((u) => ({ code: u.emp_code, name: u.name, department: u.department, role: u.role }));
    return res.json({ success: true, employees });
  }),
};
