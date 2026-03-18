import mongoose from "mongoose";
import { connectDB } from "./src/config/db.js";

async function dropLegacyIndex() {
  try {
    await connectDB();
    const collection = mongoose.connection.collection("attendances");
    
    console.log("Current indexes:");
    const indexes = await collection.indexes();
    console.log(JSON.stringify(indexes, null, 2));

    console.log("Dropping legacy indexes...");
    const toDrop = ["emp_code_1_date_1", "emp_code_1", "month_1", "date_1"];
    for (const name of toDrop) {
      try {
        await collection.dropIndex(name);
        console.log(`Successfully dropped ${name}`);
      } catch (e) {
        console.log(`Skipped ${name}: ${e.message}`);
      }
    }
  } catch (err) {
    console.error("FATAL ERROR IN DROP SCRIPT:", err);
  } finally {
    await mongoose.connection.close();
  }
}

dropLegacyIndex();
