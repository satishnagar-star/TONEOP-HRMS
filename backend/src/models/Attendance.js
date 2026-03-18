import mongoose from "mongoose";

// Flexible schema — attendance documents have varying fields based on CSV uploads
const attendanceSchema = new mongoose.Schema(
  {
    emp_code: { type: String, index: true },
    month: { type: String, index: true }, // format: YYYY-MM
  },
  {
    strict: false, // allow any extra fields from CSV
    timestamps: true,
  }
);

export const Attendance = mongoose.model("Attendance", attendanceSchema);
