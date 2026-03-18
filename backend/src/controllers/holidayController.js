import { asyncHandler } from "../utils/asyncHandler.js";
import { Holiday } from "../models/Holiday.js";

export const holidayController = {
  getAll: asyncHandler(async (req, res) => {
    const holidays = await Holiday.find().sort({ date: 1 });
    res.json({ success: true, holidays });
  }),

  create: asyncHandler(async (req, res) => {
    const { date, name } = req.body;
    if (!date || !name) return res.status(400).json({ success: false, message: "Date and Name are required" });

    const holiday = await Holiday.findOneAndUpdate(
      { date },
      { name },
      { upsert: true, new: true }
    );
    res.json({ success: true, holiday });
  }),

  delete: asyncHandler(async (req, res) => {
    await Holiday.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Holiday deleted" });
  })
};
