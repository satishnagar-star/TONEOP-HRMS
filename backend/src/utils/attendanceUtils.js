import { parse, format, differenceInMinutes, isBefore, isAfter, isValid, getDay } from "date-fns";

/**
 * Strict RegEx for Shift Format: ^\[\d{2}:\d{2}-\d{2}:\d{2}\]\[\d{2}:\d{2}\]$
 * Example: [09:00-18:00][01:00]
 */
const SHIFT_REGEX = /^\[\d{2}:\d{2}-\d{2}:\d{2}\]\[\d{2}:\d{2}\]$/;

/**
 * Date Format: DD/MMM/YYYY HH:mm:ss
 * Example: 01/Feb/2026 09:39:57
 */
const DATE_FORMAT = "dd/MMM/yyyy HH:mm:ss";

/**
 * Header Configuration (Case-insensitive)
 */
const REQUIRED_HEADERS = ["Code", "Employee", "Shift", "Date/Time", "Status"];

/**
 * Validate CSV Headers
 */
export function validateHeaders(headers) {
  const normalizedHeaders = headers.map(h => h.trim().toLowerCase());
  const missing = REQUIRED_HEADERS.filter(h => !normalizedHeaders.includes(h.toLowerCase()));
  return missing;
}

/**
 * Parse and Validate a single row
 */
export function validateRow(row, rowNum) {
  const errors = [];
  
  // Robust key mapping (flexible headers)
  const findKey = (candidates) => {
    const key = Object.keys(row).find(k => candidates.includes(k.trim().toLowerCase()));
    return key ? row[key] : null;
  };

  const Code = findKey(["code", "emp_code", "employee code"]);
  const Employee = findKey(["employee", "name", "employee name"]);
  const Shift = findKey(["shift"]);
  const Status = findKey(["status", "punch type", "in/out"]);
  
  // Advanced Date/Time extraction (handle split columns or partial columns)
  let datePart = findKey(["date/time", "datetime", "date", "attendance date"]);
  let timePart = findKey(["time", "punch time", "clock"]);

  let DateTime = "";
  if (datePart && timePart && !datePart.toString().includes(":") && !datePart.toString().toLowerCase().includes("am") && !datePart.toString().toLowerCase().includes("pm")) {
    // If datePart exists but doesn't look like it has time, and timePart exists, combine them
    DateTime = `${datePart} ${timePart}`;
  } else {
    DateTime = datePart || timePart;
  }

  if (!Code) errors.push({ row_number: rowNum, reason: "Employee Code is missing" });
  if (!Shift || !SHIFT_REGEX.test(Shift)) errors.push({ row_number: rowNum, reason: Shift ? "Invalid Shift Format" : "Shift is missing" });
  if (!Status || !["IN", "OUT"].includes(Status.toString().toUpperCase())) errors.push({ row_number: rowNum, reason: "Status missing or not IN/OUT" });

  if (!DateTime) {
    errors.push({ row_number: rowNum, reason: "No Date/Time information found (looked for Date/Time, or split Date and Time)" });
  } else {
    try {
      // Clean up string (remove excess spaces)
      const dateStrClean = DateTime.toString().replace(/\s+/g, ' ').trim();
      
      const formats = [
        "dd/MMM/yyyy HH:mm:ss",
        "dd/MMM/yyyy HH:mm",
        "EEE, dd-MMM HH:mm:ss", 
        "dd-MMM HH:mm:ss",     
        "dd-MMM HH:mm",
        "EEE, dd-MMM HH:mm",
        "dd/MM/yyyy HH:mm:ss",
        "dd/MM/yyyy HH:mm",
        "yyyy-MM-dd HH:mm:ss",
        "EEE, dd-MMM",
        "dd-MMM"
      ];

      let parsedDate = null;
      for (const fmt of formats) {
        const p = parse(DateTime.toString(), fmt, new Date(2026, 0, 1));
        if (isValid(p)) {
          parsedDate = p;
          break;
        }
      }

      if (!parsedDate) {
        errors.push({ row_number: rowNum, reason: `Date/Time format not recognized: ${DateTime}` });
      } else {
        return {
          isValid: errors.length === 0,
          errors,
          data: {
            emp_code: Code.toString(),
            employee_name: Employee || "Unknown",
            shift: Shift,
            date_obj: parsedDate,
            date_str: format(parsedDate, "dd/MM/yyyy"),
            month_str: format(parsedDate, "yyyy-MM"),
            time_str: format(parsedDate, "HH:mm"),
            status: Status.toString().toUpperCase(),
            original_row: row 
          }
        };
      }
    } catch (err) {
      errors.push({ row_number: rowNum, reason: `Critical date parsing error: ${err.message}` });
    }
  }

  return { isValid: false, errors, data: null };
}

/**
 * Consolidate Punches and Calculate Status
 */
export function processAttendance(group, holidays, user) {
  const punchesIn = group.filter(p => p.status === "IN").sort((a, b) => a.date_obj - b.date_obj);
  const punchesOut = group.filter(p => p.status === "OUT").sort((a, b) => a.date_obj - b.date_obj);

  const isMissing = group[0]?.status === "MISSING_PUNCH";
  const time_in = !isMissing && punchesIn.length > 0 ? punchesIn[0].time_str : null;
  const time_out = !isMissing && punchesOut.length > 0 ? punchesOut[punchesOut.length - 1].time_str : null;

  const { shift, emp_code, employee_name, date_str, month_str } = group[0];
  
  // Late Minutes Calculation
  const shiftStartStr = shift.substring(1, 6); // [09:00-18:00] -> 09:00
  let late_minute = 0;
  if (time_in) {
    const [sH, sM] = shiftStartStr.split(":").map(Number);
    const [iH, iM] = time_in.split(":").map(Number);
    const startInDay = new Date(group[0].date_obj);
    startInDay.setHours(sH, sM, 0, 0);
    const actualIn = new Date(group[0].date_obj);
    actualIn.setHours(iH, iM, 0, 0);

    if (isAfter(actualIn, startInDay)) {
      late_minute = differenceInMinutes(actualIn, startInDay);
    }
  }

  // Attendance Status Logic
  let status = "Absent";
  let duration = 0;

  if (time_in && time_out) {
    const [iH, iM] = time_in.split(":").map(Number);
    const [oH, oM] = time_out.split(":").map(Number);
    const tIn = new Date(group[0].date_obj); tIn.setHours(iH, iM, 0, 0);
    const tOut = new Date(group[0].date_obj); tOut.setHours(oH, oM, 0, 0);
    duration = differenceInMinutes(tOut, tIn) / 60; // hours

    if (duration > 6) {
      status = "Present";
    } else {
      status = "Halfday";
    }
  } else if (time_in || time_out) {
    status = "Halfday";
  }

  // Holiday / Weekoff check
  const isHoliday = holidays.some(h => h.date === date_str);
  const dayOfWeek = getDay(group[0].date_obj); // 0 = Sun, 6 = Sat
  const isSunday = dayOfWeek === 0;
  const isSaturday = dayOfWeek === 6;
  const isITDept = user?.department?.toLowerCase() === "it" || user?.department?.toLowerCase() === "it dept";

  const isWeekoff = isITDept ? (isSaturday || isSunday) : isSunday;

  if (status === "Absent") {
    if (isHoliday) status = "Holiday";
    else if (isWeekoff) status = "WeekOff";
  }

  // Business Logic: Sunday Present -> +1 Leave
  let plus_one_leave = false;
  if (isSunday && status === "Present") {
    plus_one_leave = true;
  }

  return {
    emp_code,
    employee_name,
    date: date_str,
    month: month_str,
    time_in,
    time_out,
    late_minute,
    status,
    shift,
    plus_one_leave,
    balance_leave: user?.leave_balance || 0,
    balance_late_minutes: user?.total_late_minutes || 0
  };
}
