import express, { Request, Response } from 'express';
import httpProxy from 'http-proxy';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Create a proxy server
const apiProxy = httpProxy.createProxyServer();

// Define service routes
const services = {
    users: process.env.USERS_SERVICE_URL || 'http://localhost:4001',
    products: process.env.PRODUCTS_SERVICE_URL || 'http://localhost:4002',
    orders: process.env.ORDERS_SERVICE_URL || 'http://localhost:4003',
};

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'api-gateway' });
});


// Route requests to appropriate services
app.use('/api/users', (req: Request, res: Response) => {
  apiProxy.web(req, res, { target: services.users });
});

app.use('/api/products', (req: Request, res: Response) => {
  apiProxy.web(req, res, { target: services.products });
});

app.use('/api/orders', (req: Request, res: Response) => {
  apiProxy.web(req, res, { target: services.orders });
});

// Fallback for undefined routes
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start the server
app.listen(port, () => {
  console.log(`API Gateway is running on http://localhost:${port}`);
});