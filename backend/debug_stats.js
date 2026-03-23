import mongoose from "mongoose";
import { User } from "./src/models/User.js";
import { Attendance } from "./src/models/Attendance.js";
import { format, parse } from "date-fns";
import dotenv from "dotenv";

dotenv.config();

async function debug() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/hrms");
  
  const empCode = "BTP660";
  const user = await User.findOne({ emp_code: empCode });
  console.log("USER DOC:", JSON.stringify(user, null, 2));

  const month = "2026-02";
  const attendanceDoc = await Attendance.findOne({ employee_code: empCode, Date: month });
  console.log("ATTENDANCE DOC RECORDS COUNT:", attendanceDoc?.records?.length || 0);
  
  if (attendanceDoc) {
    console.log("SAMPLE RECORD:", JSON.stringify(attendanceDoc.records[0], null, 2));
    const weekOffs = attendanceDoc.records.filter(r => r.status === "WeekOff");
    console.log("WEEKOFF COUNT IN DB:", weekOffs.length);
  }

  // Test custom logic
  const [year, monthNum] = month.split("-").map(Number);
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  console.log("DAYS IN MONTH:", daysInMonth);
  for (let d = 1; d <= 7; d++) {
     const dateStr = `${String(d).padStart(2, "0")}/${String(monthNum).padStart(2, "0")}/${year}`;
     const dateObj = parse(dateStr, "dd/MM/yyyy", new Date());
     const dayName = format(dateObj, "EEEE");
     console.log(`${dateStr} is ${dayName}`);
  }

  await mongoose.disconnect();
}

debug();
