import express from "express";
import cors from "cors";
import morgan from "morgan";
import { cleanEnv, str } from "envalid";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import { connectDB } from "./config/db.js";
import rateLimit from "express-rate-limit";
import {ApiError} from "./utils/ApiError.js";

// Load environment variables first
dotenv.config();



// Validate environment variables
const env = cleanEnv(process.env, {
  NODE_ENV: str({
    choices: ["development", "production"],
    default: "development",
  }),
  FRONTEND_URL: str({
    default: "http://localhost:5173",
    desc: "Frontend URL for CORS",
  }),
});

const app = express();

app.use(cors())

// Middleware
app.use(
  cors({
    origin: env.NODE_ENV === "production" ? env.FRONTEND_URL : "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(morgan("dev"));
app.use(express.json());

// Rate limiting for sensitive routes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  handler: (req, res, next) => next(new ApiError(429, "Too many requests")),
});
app.use("/v1/api/login", limiter);
app.use("/v1/api/setup-admin", limiter);

// Routes
app.use("/v1/api", authRoutes);

app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Welcome to the WASA Faisalabad!",
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// Handle 404s
app.use((req, res, next) => {
  next(new ApiError(404, `Resource not found: ${req.path}`));
});

// Error handling middleware
app.use((err, req, res, next) => {
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    error: {
      status: statusCode,
      message: err.message || "Internal Server Error",
      details: err.details || null,
    },
  });
});


export default app;
