import { format, parse, isAfter, isSameDay } from "date-fns";
import { User } from "../models/User.js";

/**
 * Check and apply HR policies for a user:
 * 1. Monthly Late Minutes Reset (to 90)
 * 2. Monthly Leave Accrual (+1)
 * 3. Annual Leave Reset (March 31st -> 2)
 */
export async function applyHRPolicies(user) {
  const now = new Date();
  const currentMonth = format(now, "yyyy-MM");
  const currentYear = now.getFullYear();
  const march31 = new Date(currentYear, 2, 31); // Month is 0-indexed, 2 = March

  let needsUpdate = false;
  const updates = {};

  // 1. Annual Leave Reset (March 31st)
  if (!user.leaveResetYear || currentYear > user.leaveResetYear) {
    if (isAfter(now, march31) || isSameDay(now, march31)) {
      user.leave_balance = 2;
      user.leaveResetYear = currentYear;
      updates.leave_balance = 2;
      updates.leaveResetYear = currentYear;
      needsUpdate = true;
    }
  }

  // 2. Monthly Late Reset (1st of every month)
  if (!user.lastLateResetMonth || currentMonth > user.lastLateResetMonth) {
    user.total_late_minutes = 90;
    user.lastLateResetMonth = currentMonth;
    updates.total_late_minutes = 90;
    updates.lastLateResetMonth = currentMonth;
    needsUpdate = true;
  }

  // 3. Monthly Leave Accrual (+1 every month)
  if (!user.lastLeaveAccrualMonth || currentMonth > user.lastLeaveAccrualMonth) {
    // Only accrue if we didn't just reset it (reset already set it to 2 for the month)
    // But policy says: Starts with 2, +1 every month. 
    // If it's a new month, add 1.
    user.leave_balance = (user.leave_balance || 0) + 1;
    user.lastLeaveAccrualMonth = currentMonth;
    updates.leave_balance = user.leave_balance;
    updates.lastLeaveAccrualMonth = currentMonth;
    needsUpdate = true;
  }

  if (needsUpdate) {
    await User.updateOne({ _id: user._id }, { $set: updates });
  }

  return user;
}

/**
 * Apply policies to all users (used for batch updates)
 */
export async function applyPoliciesToAll() {
  const users = await User.find();
  for (const user of users) {
    await applyHRPolicies(user);
  }
}
