import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from "pg";
import * as schema from './schema.js';

// THE BUG HERE:
// When deployed to prod in local k8s instance through minikube, the order-service successfully connects to the database, but fails to connect to the product-service and user-service, which results in 500 errors when trying to create orders. 
// This is because the environment variables for the service URLs are not being loaded correctly, likely due to the commented out dotenv configuration.
// If these variables are not set, the order-service will not be able to reach the other services, leading to errors when it tries to create orders that require data from those services.
// The dotenv import and configuration is commented out, which means environment variables from the .env file won't be loaded.
// I check if the ConfigMap was correctly mounted and if the pods could access the env variables.
// KEYWORDS I found while debugging: Docker Baking Problems, Environment Variables Not Loading, Local Kubernetes Deployment Issues


// Now though, it is working, in production (local k8s instance).

// import * as dotenv from 'dotenv';

// if (process.env.NODE_ENV !== 'production') {
//   dotenv.config();
// }

console.log('[DB]: Initializing database connection...');
console.log('[DB]: Connection string exists:', !!process.env.POSTGRES_DB_URL);


const pool = new Pool({
  connectionString: process.env.POSTGRES_DB_URL!,
  ssl: {
    rejectUnauthorized: false  // Enable SSL for Neon
  },
});

pool.on("connect", () => {
  console.log("[DB CONNECTION]: Successfully connected to the database");
});

pool.on("error", (error) => {
  console.log("[DB CONNECTION]: Something went wrong");
  console.error(error);
  process.exit(1); // Exit the process with an error code
});


export const db = drizzle(pool, { schema });