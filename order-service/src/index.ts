import express from 'express';

// import dotenv from 'dotenv';
import router from './routes/routes.js';

// if (process.env.NODE_ENV !== 'production') {
//   dotenv.config();
// }

console.log('🔍 Environment Variables Check:');
console.log('  PORT:', process.env.PORT);
console.log('  PRODUCT_SERVICE_URL:', process.env.PRODUCT_SERVICE_URL);
console.log('  USER_SERVICE_URL:', process.env.USER_SERVICE_URL);
console.log('  POSTGRES_DB_URL exists:', !!process.env.POSTGRES_DB_URL);

const PORT = process.env.PORT || 3003;
const app = express();

// k8s health check probe endpoint
app.get('/health', (req, res) => {
  res.status(200)
    .json({ message: 'Order Service is up and running', service: 'Order Service' });
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/orders', router);


app.listen(PORT, () => {
  console.log(`[ORDER-SERVICE]: Server is running at http://localhost:${PORT}`);
});