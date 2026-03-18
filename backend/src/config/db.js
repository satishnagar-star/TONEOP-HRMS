import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

export async function connectDB() {
  try {
    await mongoose.connect(env.MONGO_URI);
    logger.info("✅ MongoDB connected successfully");
  } catch (err) {
    logger.error({ err }, "❌ MongoDB connection failed");
    process.exit(1);
  }
}
