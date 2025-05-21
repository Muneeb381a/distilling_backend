import pkg from "pg";
import dotenv from "dotenv";
import { cleanEnv, str, port, url } from "envalid";
import logger from "../utils/logger.js";

dotenv.config();

const { Pool } = pkg;

// Validate environment variables
const env = cleanEnv(process.env, {
  DATABASE_URL: url({
    desc: "PostgreSQL connection URL",
    default: undefined,
  }),
  DB_USER: str({
    desc: "PostgreSQL username",
    default: undefined,
  }),
  DB_HOST: str({
    desc: "PostgreSQL host",
    default: undefined,
  }),
  DB_DATABASE: str({
    desc: "PostgreSQL database name",
    default: undefined,
  }),
  DB_PASSWORD: str({
    desc: "PostgreSQL password",
    default: undefined,
  }),
  DB_PORT: port({
    desc: "PostgreSQL port",
    default: 5432,
  }),
});

// PostgreSQL connection pool
const poolConfig = env.DATABASE_URL
  ? {
      connectionString: env.DATABASE_URL,
      ssl:
        env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    }
  : {
      user: env.DB_USER,
      host: env.DB_HOST,
      database: env.DB_DATABASE,
      password: env.DB_PASSWORD,
      port: env.DB_PORT,
    };

const pool = new Pool({
  ...poolConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Handle pool errors
pool.on("error", (err, client) => {
  logger.error({
    message: "Unexpected error on idle client",
    error: err.message,
    stack: err.stack,
  });
  // Attempt to reconnect
  setTimeout(() => initializePool(), 5000);
});

// Initialize connection and create tables
const connectDB = async () => {
  let retries = 5;
  while (retries > 0) {
    try {
      const client = await pool.connect();
      logger.info("Successfully connected to PostgreSQL");

      // Create users table
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(30) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'supervisor')),
          name VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      logger.info("Users table initialized");

      client.release();
      return;
    } catch (err) {
      logger.error({
        message: "Failed to connect to PostgreSQL",
        error: err.message,
        retriesLeft: retries - 1,
      });
      retries -= 1;
      if (retries === 0) {
        logger.error("Exhausted retries. Shutting down.");
        throw new Error("Database connection failed");
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
};

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("Received SIGTERM. Closing database pool.");
  await pool.end();
  logger.info("Database pool closed.");
  process.exit(0);
});

export { pool, connectDB };
