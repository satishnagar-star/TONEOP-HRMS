import mongoose from "mongoose";

const leaveSchema = new mongoose.Schema(
  {
    employee_code: { type: String, required: true, uppercase: true },
    employee_name: { type: String, required: true },
    date_start: { type: String, required: true }, // DD/MM/YYYY
    date_end: { type: String, required: true },   // DD/MM/YYYY
    subject: { type: String, required: true },
    detail: { type: String },
    status: { 
      type: String, 
      enum: ["Pending", "Approved", "Rejected"], 
      default: "Pending" 
    },
    days: { type: Number, default: 1 }
  },
  { timestamps: true }
);

export const Leave = mongoose.model("Leave", leaveSchema);
