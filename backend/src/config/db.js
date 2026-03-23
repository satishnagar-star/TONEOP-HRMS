import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

export async function connectDB() {
  try {
    const conn = await mongoose.connect(env.MONGO_URI);
    logger.info(`✅ MongoDB connected successfully to database: ${conn.connection.db.databaseName}`);
  } catch (err) {
    logger.error({ err }, "❌ MongoDB connection failed");
    process.exit(1);
  }
}
