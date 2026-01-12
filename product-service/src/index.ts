import dotenv from "dotenv";
import connectDB from "./db.js";
import productRoutes from "./routes/routes.js";
import express from "express";
dotenv.config();

connectDB();


const PORT = process.env.PORT || 3001;

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// k8s health check probe endpoint
app.get("/health", (req, res) => {
  res.status(200).json({message: "Product Service is up and running", service: "Product Service"});
});

app.use("/api/products", productRoutes);


app.listen(PORT, () => {
  console.log(`[PRODUCT-SERVICE]: Server is running at http://localhost:${PORT}`);
});
