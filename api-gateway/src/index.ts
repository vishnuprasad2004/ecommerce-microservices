import express, { Request, Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cors from "cors";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const services = {
  products: process.env.PRODUCT_SERVICE_URL || 'http://product-service:3001',
  users:    process.env.USER_SERVICE_URL    || 'http://user-service:3002',
  orders:   process.env.ORDER_SERVICE_URL   || 'http://order-service:3003',
};

// Allows your backend API to accept requests from different domains (e.g., frontend running on another port)
app.use(cors());
// Helps protect against common vulnerabilities like XSS, clickjacking, MIME sniffing, etc.
app.use(helmet());
// HTTP request logger middleware
// 'combined' format logs detailed information including IP, method, URL, status, response time
// Useful for debugging and monitoring in production
app.use(morgan('combined'));
// Rate limiting middleware to prevent abuse and brute-force attacks
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Health check — before proxy so it doesn't get forwarded
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'api-gateway' });
});

// Mount on root "/" with pathFilter — Express won't strip the prefix this way
app.use(createProxyMiddleware({
  pathFilter: '/api/orders',
  target: services.orders,
  changeOrigin: true,
  on: {
    error: (_err, _req, res) => {
      (res as Response).status(502).json({ message: 'Order service unavailable' });
    },
  },
}));

app.use(createProxyMiddleware({
  pathFilter: '/api/products',
  target: services.products,
  changeOrigin: true,
  on: {
    error: (_err, _req, res) => {
      (res as Response).status(502).json({ message: 'Product service unavailable' });
    },
  },
}));

app.use(createProxyMiddleware({
  pathFilter: '/api/users',
  target: services.users,
  changeOrigin: true,
  on: {
    error: (_err, _req, res) => {
      (res as Response).status(502).json({ message: 'User service unavailable' });
    },
  },
}));

app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

app.listen(port, () => {
  console.log(`API Gateway running on http://localhost:${port}`);
});