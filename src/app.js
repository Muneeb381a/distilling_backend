import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { cleanEnv, str } from 'envalid';
import logger from './utils/logger.js';


// Validate environment variables
const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'production'], default: 'development' }),
  FRONTEND_URL: str({ default: 'http://localhost:5174', desc: 'Frontend URL for CORS' }),
});

const app = express();

// Middleware
app.use(
  cors({
    origin: env.NODE_ENV === 'production' ? env.FRONTEND_URL : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use(morgan('dev')); // Request logging
app.use(express.json());

// Routes


app.get("/", (req, res) => {
    res.status(200).json({
      status: "success",
      message: "Welcome to the WASA Faisalabad!",
      timestamp: new Date().toISOString()
    });
  });
  

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Handle 404s
app.use(async (req, res, next) => {
  const error = new (await import('./utils/ApiError.js')).NotFoundError(
    `Resource not found: ${req.path}`,
  );
  next(error);
});

// Error handling middleware (must be last)
app.use(logger);

export default app;