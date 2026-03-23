import { asyncHandler } from "../utils/asyncHandler.js";
import { Leave } from "../models/Leave.js";
import { User } from "../models/User.js";
import { parse, differenceInDays } from "date-fns";

export const leaveController = {
  apply: asyncHandler(async (req, res) => {
    const { date_start, date_end, subject, detail } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Calculate days
    const dStart = parse(date_start, "dd/MM/yyyy", new Date());
    const dEnd = parse(date_end, "dd/MM/yyyy", new Date());
    const days = differenceInDays(dEnd, dStart) + 1;

    const leave = await Leave.create({
      employee_code: user.emp_code,
      employee_name: user.name,
      date_start,
      date_end,
      subject,
      detail,
      days
    });

    res.status(201).json({ success: true, leave });
  }),

  getAll: asyncHandler(async (req, res) => {
    const leaves = await Leave.find().sort({ createdAt: -1 });
    res.json({ success: true, leaves });
  }),

  approve: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const leave = await Leave.findById(id);
    if (!leave) return res.status(404).json({ success: false, message: "Leave not found" });

    if (leave.status !== "Pending") {
      return res.status(400).json({ success: false, message: "Leave is already " + leave.status });
    }

    // Deduct from balance
    const user = await User.findOne({ emp_code: leave.employee_code.toUpperCase() });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (user.leave_balance < leave.days) {
      return res.status(400).json({ success: false, message: "Insufficient leave balance" });
    }

    user.leave_balance -= leave.days;
    await user.save();

    leave.status = "Approved";
    await leave.save();

    res.json({ success: true, leave });
  }),

  reject: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const leave = await Leave.findById(id);
    if (!leave) return res.status(404).json({ success: false, message: "Leave not found" });

    leave.status = "Rejected";
    await leave.save();

    res.json({ success: true, leave });
  }),

  getUserLeaves: asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    const leaves = await Leave.find({ employee_code: user.emp_code }).sort({ createdAt: -1 });
    res.json({ success: true, leaves });
  })
};
