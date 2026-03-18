import mongoose from "mongoose";

const holidaySchema = new mongoose.Schema(
  {
    date: { type: String, required: true, unique: true }, // format: DD/MM/YYYY or YYYY-MM-DD
    name: { type: String, required: true },
  },
  { timestamps: true }
);

export const Holiday = mongoose.model("Holiday", holidaySchema);
