import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from "pg";
import * as schema from './schema.js';
import * as dotenv from 'dotenv';

dotenv.config(); // Add this to load .env file

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
});


export const db = drizzle(pool, { schema });