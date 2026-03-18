import mongoose from "mongoose";

// Monthly nested schema — documents represent one employee's data for a specific month
const attendanceSchema = new mongoose.Schema(
  {
    employee_code: { type: String, required: true, index: true },
    employee_name: { type: String },
    Date: { type: String, required: true, index: true }, // format: YYYY-MM
    records: [
      {
        date: { type: String, required: true }, // format: DD-MM-YYYY
        time_in: { type: String },
        time_out: { type: String },
        late_minute: { type: Number, default: 0 },
        status: { type: String },
        shift: { type: String },
        balance_leave: { type: Number, default: 0 },
        balance_late_minutes: { type: Number, default: 0 },
      }
    ]
  },
  {
    timestamps: true,
  }
);

// Unique index: One document per employee per month
attendanceSchema.index({ employee_code: 1, Date: 1 }, { unique: true });

// Index for fast individual record lookups (nested)
attendanceSchema.index({ "records._id": 1 });

export const Attendance = mongoose.model("Attendance", attendanceSchema);
