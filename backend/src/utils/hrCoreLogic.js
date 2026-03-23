import { format, parse, startOfMonth, endOfMonth, isSameMonth } from "date-fns";
import { User } from "../models/User.js";

/**
 * Ensures user balances are up-to-date for the Given Month
 * Handles:
 * - Monthly +1 Leave Accrual
 * - Monthly Late Minute Reset (to 90)
 * - Yearly Reset (April 1st)
 */
export async function ensureUserBalances(userDoc, targetDateStr) {
  const targetDate = parse(targetDateStr, "dd/MM/yyyy", new Date());
  const targetMonthStr = format(targetDate, "yyyy-MM");
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth(); // 0-11
  
  let updated = false;

  // 1. Check for Yearly Reset (April 1st)
  // Rule: Collapses on March 31st, Starts from 1 in April
  if (targetMonth >= 3 && userDoc.leaveResetYear !== targetYear) {
     // If we are in April or later and haven't reset for this fiscal year yet
     userDoc.leave_balance = 1; 
     userDoc.leaveResetYear = targetYear;
     userDoc.lastLeaveAccrualMonth = targetMonthStr;
     userDoc.total_late_minutes = 90;
     userDoc.lastLateResetMonth = targetMonthStr;
     updated = true;
  }

  // 2. Monthly Accruals (if not already done for this month)
  if (userDoc.lastLeaveAccrualMonth !== targetMonthStr) {
    if (userDoc.lastLeaveAccrualMonth) {
      // Not the first time, and not the reset month
      userDoc.leave_balance += 1;
    }
    userDoc.lastLeaveAccrualMonth = targetMonthStr;
    updated = true;
  }

  if (userDoc.lastLateResetMonth !== targetMonthStr) {
    userDoc.total_late_minutes = 90;
    userDoc.lastLateResetMonth = targetMonthStr;
    updated = true;
  }

  if (updated) {
    await User.updateOne({ _id: userDoc._id }, { $set: {
      leave_balance: userDoc.leave_balance,
      total_late_minutes: userDoc.total_late_minutes,
      lastLeaveAccrualMonth: userDoc.lastLeaveAccrualMonth,
      lastLateResetMonth: userDoc.lastLateResetMonth,
      leaveResetYear: userDoc.leaveResetYear
    }});
  }

  return userDoc;
}

/**
 * Deduct Late Minutes from Balance
 */
export async function deductLateMinutes(userId, minutes) {
  if (minutes <= 0) return;
  await User.updateOne({ _id: userId }, { $inc: { total_late_minutes: -minutes } });
}

/**
 * Use Leave Balance (Convert Absent to Leave)
 */
export async function useLeaveBalance(userId, days = 1) {
  const user = await User.findById(userId);
  if (user && user.leave_balance >= days) {
    await User.updateOne({ _id: userId }, { $inc: { leave_balance: -days } });
    return true;
  }
  return false;
}

/**
 * Grant Overtime Leave (+1)
 */
export async function grantOvertimeLeave(userId) {
  await User.updateOne({ _id: userId }, { $inc: { leave_balance: 1 } });
}
