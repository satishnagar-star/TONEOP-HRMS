import mongoose from "mongoose";
import { User } from "./src/models/User.js";
import { Attendance } from "./src/models/Attendance.js";
import { attendanceController } from "./src/controllers/attendanceController.js";
import { env } from "./src/config/env.js";
import { connectDB } from "./src/config/db.js";

async function runTest() {
  await connectDB();
  
  const sampleData = [
    {
      "Code": "BTP105",
      "Employee": "KOMAL GEEDKAR",
      "Shift": "[09:00-18:00][01:00]",
      "Date/Time": "18/Feb/2026 09:30:00",
      "Status": "IN"
    },
    {
      "Code": "BTP105",
      "Employee": "KOMAL GEEDKAR",
      "Shift": "[09:00-18:00][01:00]",
      "Date/Time": "18/Feb/2026 18:30:00",
      "Status": "OUT"
    }
  ];

  const req = {
    body: { documents: sampleData }
  };
  
  const res = {
    status: (code) => ({
      json: (data) => {
        console.log(`Response Status: ${code}`);
        console.log("Response Data:", JSON.stringify(data, null, 2));
      }
    })
  };

  try {
    await attendanceController.uploadCsvData(req, res);
  } catch (err) {
    console.error("TEST SCRIPT CAUGHT ERROR:", err);
  } finally {
    await mongoose.connection.close();
  }
}

runTest();
