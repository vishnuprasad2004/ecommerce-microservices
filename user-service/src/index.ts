import express from "express";
import dotenv from "dotenv";
import router from "./routes/routes.js";

dotenv.config();
const PORT = process.env.PORT || 3002;
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/users", router);

// k8s health check probe endpoint
app.get("/health", (req, res) => {
  res
    .status(200)
    .json({ message: "User Service is up and running", service: "User Service" });
});


app.listen(PORT, () => {
  console.log(`[USER-SERVICE]: Server is running at http://localhost:${PORT}`);
});