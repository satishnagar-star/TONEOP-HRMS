import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    emp_code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ["User", "Admin", "SuperAdmin"],
      default: "User",
    },
    password: { type: String, required: true },
    leave_balance: { type: Number, default: 2 },
    total_late_minutes: { type: Number, default: 90 },
    lastLeaveAccrualMonth: { type: String }, // YYYY-MM
    lastLateResetMonth: { type: String },    // YYYY-MM
    leaveResetYear: { type: Number },        // YYYY
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Compare plain password to hashed
userSchema.methods.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.password);
};

export const User = mongoose.model("User", userSchema);
