import mongoose from "mongoose";
import logger from "./utils/logger.js";

export default async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URL!);
    logger.info("[DB CONNECTION]: Successfully connected to the database");
  } catch (e) {
    logger.error("[DB CONNECTION]: Something when wrong", { error: e });
    process.exit(1);
  }
}
