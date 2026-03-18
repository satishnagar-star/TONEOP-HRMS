/**
 * Seed script — creates a default SuperAdmin user in MongoDB.
 * emp_code: BTP660  password: 123456
 *
 * Run once: node src/scripts/seed.js
 */
import "dotenv/config";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { User } from "../models/User.js";

async function seed() {
  await mongoose.connect(env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  const existing = await User.findOne({ emp_code: "BTP660" });
  if (existing) {
    console.log("⚠️  SuperAdmin BTP660 already exists — skipping.");
  } else {
    const admin = new User({
      emp_code: "BTP660",
      name: "Super Admin",
      department: "Management",
      role: "SuperAdmin",
      password: "123456",
    });
    await admin.save();
    console.log("✅ SuperAdmin user created: BTP660 / 123456");
  }

  await mongoose.disconnect();
  console.log("🔌 Disconnected.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});
