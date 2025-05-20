import pkg from "pg";
import dotenv from "dotenv";
import { cleanEnv, str, port } from "envalid";
import winston from "winston";

dotenv.config();

const { Pool } = pkg;

// Logger setup for database errors
const logger = winston.createLogger({
  level: "error",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: "error.log" }),
    new winston.transports.Console(),
  ],
});

// Validate environment variables
const env = cleanEnv(process.env, {
  DB_USER: str({ desc: "PostgreSQL username" }),
  DB_HOST: str({ desc: "PostgreSQL host" }),
  DB_DATABASE: str({ desc: "PostgreSQL database name" }),
  DB_PASSWORD: str({ desc: "PostgreSQL password" }),
  DB_PORT: port({ desc: "PostgreSQL port", default: 5432 }),
});

// PostgreSQL connection pool
const pool = new Pool({
  user: env.DB_USER,
  host: env.DB_HOST,
  database: env.DB_DATABASE,
  password: env.DB_PASSWORD,
  port: env.DB_PORT,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Timeout after 2 seconds if connection fails
});

// Handle pool errors
pool.on("error", (err, client) => {
  logger.error({
    message: "Unexpected error on idle client",
    error: err.message,
    stack: err.stack,
  });
  // Optionally, attempt to reconnect or notify admins
});

// Test connection on startup
async function initializePool() {
  let retries = 5;
  while (retries > 0) {
    try {
      const client = await pool.connect();
      logger.info("Successfully connected to PostgreSQL");
      client.release();
      break;
    } catch (err) {
      logger.error({
        message: "Failed to connect to PostgreSQL",
        error: err.message,
        retriesLeft: retries - 1,
      });
      retries -= 1;
      if (retries === 0) {
        logger.error("Exhausted retries. Shutting down.");
        process.exit(1);
      }
      // Wait 5 seconds before retrying
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

// Initialize pool
initializePool().catch((err) => {
  logger.error({
    message: "Failed to initialize database pool",
    error: err.message,
  });
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("Received SIGTERM. Closing database pool.");
  await pool.end();
  logger.info("Database pool closed.");
  process.exit(0);
});

export default pool;
