import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema(
  {
    ticketId: { type: String, required: true, unique: true },
    employeeCode: { type: String, required: true, index: true },
    name: { type: String, required: true },
    department: { type: String, required: true, index: true },
    date: { type: String },
    message: { type: String, required: true },
    reply: { type: String, default: "" },
    status: { type: String, enum: ["Open", "Resolved"], default: "Open" },
  },
  { timestamps: true }
);

export const Ticket = mongoose.model("Ticket", ticketSchema);
