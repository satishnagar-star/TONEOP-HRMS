import mongoose from "mongoose";

const systemLogSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    at: { type: String },
  },
  {
    strict: false, // allow extra fields like employeeCode, role, etc.
    timestamps: false,
  }
);

export const SystemLog = mongoose.model("SystemLog", systemLogSchema);
