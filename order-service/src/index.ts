import express from 'express';

import dotenv from 'dotenv';
import router from './routes/routes.js';
// import connectDB from './db.js';
dotenv.config();

// connectDB();

const PORT = process.env.PORT || 3002;
const app = express();

// k8s health check probe endpoint
app.get('/health', (req, res) => {
  res.status(200)
    .json({ message: 'Order Service is up and running', service: 'Order Service' });
});

app.listen(PORT, () => {
  console.log(`[ORDER-SERVICE]: Server is running at http://localhost:${PORT}`);
});