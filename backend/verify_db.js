import mongoose from 'mongoose';
import { Attendance } from './src/models/Attendance.js';
import { connectDB } from './src/config/db.js';

async function verify() {
  await connectDB();
  const count = await Attendance.countDocuments();
  const sample = await Attendance.findOne().lean();
  
  console.log('--- DB DIAGNOSTICS ---');
  console.log('Collection Name:', Attendance.collection.name);
  console.log('Database Name:', mongoose.connection.db.databaseName);
  console.log('Total Documents:', count);
  
  if (sample) {
    console.log('Sample Employee:', sample.employee_code);
    console.log('Month:', sample.Date);
    console.log('Records Count:', sample.records.length);
  } else {
    console.log('NO DOCUMENTS FOUND IN THIS COLLECTION');
  }
  
  process.exit(0);
}

verify().catch(err => {
  console.error(err);
  process.exit(1);
});
