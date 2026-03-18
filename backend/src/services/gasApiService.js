import { User } from "../models/User.js";
import { Attendance } from "../models/Attendance.js";
import { HttpError } from "../utils/httpError.js";

export const gasApi = {
  /**
   * Authenticate a user by emp_code and password.
   * Returns { success, user } matching the shape the controllers expect.
   */
  async login({ code, pass }) {
    const doc = await User.findOne({ emp_code: code.toUpperCase() });
    if (!doc) {
      return { success: false, message: "Invalid employee code or password" };
    }
    const match = await doc.comparePassword(pass);
    if (!match) {
      return { success: false, message: "Invalid employee code or password" };
    }
    return {
      success: true,
      user: {
        code: doc.emp_code,
        name: doc.name,
        department: doc.department,
        role: doc.role,
        leave_balance: doc.leave_balance,
        total_late_minutes: doc.total_late_minutes,
      },
    };
  },

  /**
   * Change a user's password.
   */
  async changePassword({ code, newPass }) {
    const user = await User.findOne({ emp_code: code.toUpperCase() });
    if (!user) {
      throw new HttpError(404, "User not found");
    }
    user.password = newPass; // pre-save hook hashes it
    await user.save();
    return { success: true, message: "Password changed successfully" };
  },

  /**
   * Get attendance records for an employee for a given month.
   * Returns data in the shape the frontend expects.
   */
  async attendance({ code, month }) {
    const records = await Attendance.find({
      emp_code: code.toUpperCase(),
      month,
    }).lean();
    return {
      success: true,
      employee: { code: code.toUpperCase(), month },
      records,
    };
  },

  /**
   * createTicket is no longer needed — commentsController handles persistence directly.
   */
  async createTicket() {
    return { success: true };
  },
};
