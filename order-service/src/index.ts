import express from 'express';

// import dotenv from 'dotenv';
import router from './routes/routes.js';
import logger from './utils/logger.js';

// if (process.env.NODE_ENV !== 'production') {
//   dotenv.config();
// }


logger.info('🔍 Environment Variables Check:');
logger.info('  PORT:', process.env.PORT);
logger.info('  PRODUCT_SERVICE_URL:', process.env.PRODUCT_SERVICE_URL);
logger.info('  USER_SERVICE_URL:', process.env.USER_SERVICE_URL);
logger.info('  POSTGRES_DB_URL exists:', !!process.env.POSTGRES_DB_URL);

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
  logger.info(`[ORDER-SERVICE]: Server is running at http://localhost:${PORT}`);
});