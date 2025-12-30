import mongoose from "mongoose";

export default async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URL!);
    console.log("[DB CONNECTION]: Successfully connected to the database");
  } catch (e) {
    console.log("[DB CONNECTION]: Something when wrong");
  }
}
