import dotenv from "dotenv";
import connectDB from "./db.js";
import express from "express";
dotenv.config();

connectDB();


const PORT = process.env.PORT || 8080;

const app = express();

// k8s health check probe endpoint
app.get("/health", (req, res) => {
  res.status(200).json({message: "Product Service is up and running", service: "Product Service"});
});

app.listen(PORT, () => {
  console.log(`[PRODUCT-SERVICE]: Server is running at http://localhost:${PORT}`);
});
