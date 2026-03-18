import { User } from "../models/User.js";
import { Attendance } from "../models/Attendance.js";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSunday, isSaturday, parse } from "date-fns";

export const policyService = {
  /**
   * Calculate and update User balances (Leave/Late)
   */
  async updateBalances(emp_code, month) {
    const user = await User.findOne({ emp_code });
    if (!user) return;

    const start = startOfMonth(parse(month, "yyyy-MM", new Date()));
    const end = endOfMonth(start);

    // Get all attendance for the month
    const records = await Attendance.find({
      emp_code,
      month
    }).lean();

    const totalLate = records.reduce((sum, r) => sum + (r.late_minute || 0), 0);

    // In a real system, we'd deduct from a "monthly_late_allowance" or similar
    // For this requirement: "Monthly limit: 90 minutes... Reset: 1st of every month"
    user.total_late_minutes = totalLate;

    await user.save();
  },

  /**
   * Apply Auto-Leave Logic for a specific month
   */
  async applyAutoLeave(emp_code, month, holidays) {
    const user = await User.findOne({ emp_code });
    if (!user) return;

    const start = startOfMonth(parse(month, "yyyy-MM", new Date()));
    const end = endOfMonth(start);
    const days = eachDayOfInterval({ start, end });

    for (const day of days) {
      const dateStr = format(day, "dd/MM/yyyy");
      const existing = await Attendance.findOne({ emp_code, date: dateStr });

      if (!existing) {
        // No record found -> Check if it's a workday
        const isHoliday = holidays.some(h => h.date === dateStr);
        const dayIdx = day.getDay();
        const isSun = dayIdx === 0;
        const isSat = dayIdx === 6;
        const isIT = user.department?.toLowerCase()?.includes("it");
        const isWeekoff = isIT ? (isSun || isSat) : isSun;

        if (!isHoliday && !isWeekoff) {
          // It's a workday with no punch
          let status = "Absent";
          if (user.leave_balance > 0) {
            status = "Leave";
            user.leave_balance -= 1;
            await user.save();
          }

          await Attendance.create({
            emp_code,
            employee_name: user.name,
            date: dateStr,
            month,
            status,
            late_minute: 0
          });
        }
      }
    }
  },

  /**
   * Financial Cycle Reset (April 1st)
   */
  async checkFinancialReset() {
    const now = new Date();
    if (now.getMonth() === 3 && now.getDate() === 1) { // April 0-indexed is 3
      // Reset all users
      await User.updateMany({}, { leave_balance: 2 }); // Reset to default or handle accumulation
    }
  }
};
