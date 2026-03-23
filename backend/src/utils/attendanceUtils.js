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
export function processAttendance(group) {
  const punchesIn = group.filter(p => p.status === "IN").sort((a, b) => a.date_obj - b.date_obj);
  const punchesOut = group.filter(p => p.status === "OUT").sort((a, b) => a.date_obj - b.date_obj);

  const time_in = punchesIn.length > 0 ? punchesIn[0].time_str : null;
  const time_out = punchesOut.length > 0 ? punchesOut[punchesOut.length - 1].time_str : null;

  const { shift, emp_code, employee_name, date_str, month_str } = group[0];
  
  // Late Minutes Calculation: IN vs Shift Start
  const shiftStartStr = shift.substring(1, 6); // [10:00-19:00] -> 10:00
  let late_minute = 0;
  if (time_in) {
    const [sH, sM] = shiftStartStr.split(":").map(Number);
    const [iH, iM] = time_in.split(":").map(Number);
    const shiftStart = new Date(group[0].date_obj);
    shiftStart.setHours(sH, sM, 0, 0);
    const actualIn = new Date(group[0].date_obj);
    actualIn.setHours(iH, iM, 0, 0);

    if (isAfter(actualIn, shiftStart)) {
      late_minute = differenceInMinutes(actualIn, shiftStart);
    }
  }

  // Attendance Status Logic
  let status = "Absent";
  if (time_in && time_out) {
    const [iH, iM] = time_in.split(":").map(Number);
    const [oH, oM] = time_out.split(":").map(Number);
    const tIn = new Date(group[0].date_obj); tIn.setHours(iH, iM, 0, 0);
    const tOut = new Date(group[0].date_obj); tOut.setHours(oH, oM, 0, 0);
    const duration = differenceInMinutes(tOut, tIn) / 60; // hours

    status = duration > 6 ? "Present" : "Halfday";
  } else if (time_in || time_out) {
    status = "Halfday";
  }

  return {
    emp_code,
    employee_name,
    date: date_str, // DD-MM-YYYY
    month: month_str, // YYYY-MM
    time_in,
    time_out,
    late_minute,
    status,
    shift
  };
}
