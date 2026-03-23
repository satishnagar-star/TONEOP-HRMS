import { parse, format, differenceInMinutes, isBefore, isAfter, isValid, getDay, compareAsc, compareDesc } from "date-fns";

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
 * Validate CSV Headers (Case-insensitive, allows extra columns)
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
  
  if (rowNum === 1) {
    console.log("DEBUG validateRow row 1:", { 
      availableKeys: Object.keys(row),
      Code, 
      Status,
      rawRow: row 
    });
  }
  
  // Specific priority for Date/Time column
  let dateTimeCol = findKey(["date/time", "datetime", "date & time"]);
  let dateCol = findKey(["date", "attendance date"]);
  let timeCol = findKey(["time", "punch time", "clock"]);

  let DateTime = "";
  if (dateTimeCol) {
    DateTime = dateTimeCol;
  } else if (dateCol && timeCol) {
    DateTime = `${dateCol} ${timeCol}`;
  } else {
    DateTime = dateCol || timeCol || "";
  }

  if (!Code) errors.push({ row_number: rowNum, reason: "Employee Code is missing" });
  if (!Shift || !SHIFT_REGEX.test(Shift)) errors.push({ row_number: rowNum, reason: Shift ? "Invalid Shift Format (Expected [HH:mm-HH:mm][HH:mm])" : "Shift is missing" });
  if (!Status || !["IN", "OUT"].includes(Status.toString().toUpperCase())) errors.push({ row_number: rowNum, reason: "Status missing or not IN/OUT" });

  if (!DateTime) {
    errors.push({ row_number: rowNum, reason: "Date/Time information missing" });
  } else {
    try {
      const formats = [
        "dd/MMM/yyyy HH:mm:ss",
        "dd/MMM/yyyy HH:mm",
        "dd-MM-yyyy HH:mm",
        "dd/MM/yyyy HH:mm",
        "EEE, dd-MMM HH:mm:ss", 
        "EEE, dd-MMM HH:mm",
        "EEE, dd-MMM",
        "dd-MMM HH:mm:ss",     
        "dd-MMM HH:mm",
        "dd-MMM",
        "yyyy-MM-dd HH:mm:ss",
        "dd-MM-yyyy",
        "dd/MM/yyyy"
      ];

      let parsedDate = null;
      const dateStrClean = DateTime.toString().replace(/\s+/g, ' ').trim();

      for (const fmt of formats) {
        const p = parse(dateStrClean, fmt, new Date()); 
        if (isValid(p)) {
          parsedDate = p;
          break;
        }
      }

      if (!parsedDate) {
        errors.push({ row_number: rowNum, reason: `Invalid Date/Time: ${DateTime}` });
      } else {
        return {
          isValid: errors.length === 0,
          errors,
          data: {
            emp_code: Code.toString().trim().toUpperCase(),
            employee_name: Employee ? Employee.toString().trim() : "Unknown",
            shift: Shift,
            date_obj: parsedDate,
            date_str: format(parsedDate, "dd/MM/yyyy"),
            month_str: format(parsedDate, "yyyy-MM"),
            time_str: format(parsedDate, "HH:mm"),
            status: Status.toString().toUpperCase().trim(),
            original_row: row 
          }
        };
      }
    } catch (err) {
      errors.push({ row_number: rowNum, reason: `Parsing error: ${err.message}` });
    }
  }

  return { isValid: false, errors, data: null };
}

/**
 * Consolidate Punches and Calculate Status
 */
/**
 * Core Attendance Calculation Logic (Enhanced for WeekOffs & Holidays)
 * Rules:
 * - IT Dept: Sat/Sun off. Others: Sun off.
 * - Holiday: Check against holiday list.
 * - Overtime: Worked on WeekOff = +1 Leave Balance.
 * - Status: Present (>6h), Halfday (<=6h or single punch), Absent (no punch).
 */
export function processAttendance(punches, options = {}) {
  const { 
    employee = {}, 
    holidays = [], 
    date_str = "" 
  } = options;

  let dateObj;
  if (date_str) {
    dateObj = parse(date_str, "dd/MM/yyyy", new Date());
  } else if (punches && punches.length > 0) {
    dateObj = punches[0].date_obj || parse(punches[0].date_str, "dd/MM/yyyy", new Date());
  } else {
    dateObj = new Date();
  }

  const current_date_str = date_str || (punches && punches[0] ? punches[0].date_str : format(dateObj, "dd/MM/yyyy"));
  const dayName = format(dateObj, "EEEE"); 
  const isSunday = dayName === "Sunday";
  const isSaturday = dayName === "Saturday";
  
  // Rule: IT Dept has Sat/Sun off, others only Sun
  const dept = (employee.department || "").toString().trim().toUpperCase();
  const isWeekOff = isSunday || (dept === "IT" && isSaturday);
  
  // Rule: Check Holiday
  const isHoliday = holidays.some(h => {
    const hDate = typeof h.date === "string" ? h.date : format(new Date(h.date), "dd/MM/yyyy");
    return hDate === current_date_str;
  });

  const shift = employee.shift || (punches && punches[0] ? punches[0].shift : "[10:00-19:00][09:00]");

  // Default record state
  const result = {
    date: current_date_str,
    time_in: null,
    time_out: null,
    late_minute: 0,
    status: "Absent",
    shift,
    leave_earned: 0,
    late_deducted: 0,
    emp_code: employee.emp_code || (punches && punches[0] ? punches[0].emp_code : ""),
    employee_name: employee.name || (punches && punches[0] ? punches[0].employee_name : "Unknown")
  };

  if (!punches || punches.length === 0) {
    if (isWeekOff) result.status = "WeekOff";
    else if (isHoliday) result.status = "Holiday";
    else result.status = "Absent"; 
    return result;
  }

  // Handle Punches
  const inPunches = punches
    .filter(p => p.status === "IN")
    .sort((a, b) => compareAsc(parse(a.time_str, "HH:mm", new Date()), parse(b.time_str, "HH:mm", new Date())));
  
  const outPunches = punches
    .filter(p => p.status === "OUT")
    .sort((a, b) => compareAsc(parse(a.time_str, "HH:mm", new Date()), parse(b.time_str, "HH:mm", new Date())));

  const firstIn = inPunches[0];
  const lastOut = outPunches[outPunches.length - 1];

  result.time_in = firstIn ? firstIn.time_str : null;
  result.time_out = lastOut ? lastOut.time_str : null;

  // Rule: Calculate Late Minutes
  if (result.time_in) {
    const shiftMatch = shift.match(/\[(\d{2}:\d{2})-\d{2}:\d{2}\]/);
    if (shiftMatch) {
      const shiftStartStr = shiftMatch[1];
      const [sH, sM] = shiftStartStr.split(":").map(Number);
      const [iH, iM] = result.time_in.split(":").map(Number);
      
      const shiftStartTime = new Date(dateObj); shiftStartTime.setHours(sH, sM, 0, 0);
      const punchTime = new Date(dateObj); punchTime.setHours(iH, iM, 0, 0);
      
      if (isAfter(punchTime, shiftStartTime)) {
        result.late_minute = differenceInMinutes(punchTime, shiftStartTime);
        result.late_deducted = result.late_minute;
      }
    }
  }

  // Rule: Final Status Rule (Present vs Halfday)
  if (result.time_in && result.time_out) {
    const [iH, iM] = result.time_in.split(":").map(Number);
    const [oH, oM] = result.time_out.split(":").map(Number);
    const tIn = new Date(dateObj); tIn.setHours(iH, iM, 0, 0);
    const tOut = new Date(dateObj); tOut.setHours(oH, oM, 0, 0);
    const durationHours = differenceInMinutes(tOut, tIn) / 60;

    if (durationHours > 6) result.status = "Present";
    else result.status = "Halfday";
  } else if (result.time_in || result.time_out) {
    result.status = "Halfday";
  }

  // Rule: Sunday/Weekoff Overtime (+1 Leave Balance)
  if (isWeekOff && (result.time_in || result.time_out)) {
    result.leave_earned = 1;
    // Keep status as Present/Halfday to show work
  }

  return result;
}
