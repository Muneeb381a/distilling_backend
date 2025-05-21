import winston from 'winston';
import { validationResult } from 'express-validator';
import {ApiError} from './ApiError.js'; 

// Logger setup for error logging
const logger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log' }),
    new winston.transports.Console(),
  ],
});

// Error handling middleware
const errorHandler = async (err, req, res, next) => {
  // Handle validation errors from express-validator
  const validationErrors = validationResult(req);
  if (!validationErrors.isEmpty()) {
    const error = new ApiError(400, 'Validation failed', validationErrors.array());
    logger.error({
      message: error.message,
      details: error.details,
      status: error.status,
      path: req.path,
      method: req.method,
    });
    return res.status(400).json({
      error: {
        status: 400,
        message: 'Validation failed',
        details: validationErrors.array(),
      },
    });
  }

  // Log the error
  logger.error({
    message: err.message,
    stack: err.stack,
    status: err.status || 500,
    path: req.path,
    method: req.method,
    user: req.user ? { id: req.user.id, role: req.user.role } : null,
  });

  // Handle custom ApiError instances
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: {
        status: err.status,
        message: err.message,
        details: err.details || null,
      },
    });
  }

  // Handle unexpected errors
  res.status(500).json({
    error: {
      status: 500,
      message: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? err.message : null,
    },
  });
};

export default logger;