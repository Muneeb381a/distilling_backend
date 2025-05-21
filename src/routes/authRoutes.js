import express from "express";
import {
  login,
  registerAdmin,
  registerSupervisor,
} from "../controllers/authController.js";
import {
  authMiddleware,
  adminMiddleware,
} from "../middlewares/authMiddleware.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import logger from "../utils/logger.js";
import { pool } from "../config/db.js";
import bcrypt from "bcrypt";

const router = express.Router();

// Login
router.post("/login", login);

// Register Admin (Admin access)
router.post("/register-admin", authMiddleware, adminMiddleware, registerAdmin);

// Register Supervisor (Admin access)
router.post(
  "/register-supervisor",
  authMiddleware,
  adminMiddleware,
  registerSupervisor
);

// Initial Admin Setup (Unrestricted, protected by setup key)
router.post("/setup-admin", async (req, res, next) => {
  try {
    const { username, password, name, email, setupKey } = req.body;
    if (!username || !password || !name || !email || !setupKey) {
      logger.error("Setup admin failed: Missing fields", {
        username: username || "undefined",
        email: email || "undefined",
      });
      return next(
        new ApiError(
          400,
          "Username, password, name, email, and setup key are required"
        )
      );
    }
    if (setupKey !== process.env.SETUP_KEY) {
      logger.warn("Setup admin failed: Invalid setup key", { username, email });
      return next(new ApiError(403, "Invalid setup key"));
    }

    // Reuse registration logic
    req.body = { username, password, name, email };
    return registerAdmin(req, res, next);
  } catch (err) {
    logger.error("Setup admin error", {
      error: err.message,
      username: req.body.username || "undefined",
    });
    next(err);
  }
});

// Get All Users (Admin access)
router.get(
  "/users",
  authMiddleware,
  adminMiddleware,
  async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        "SELECT id, username, role, name, email FROM users"
      );
      logger.info("Fetched users", { user: req.user.username });
      return res
        .status(200)
        .json(new ApiResponse(200, rows, "Users fetched successfully"));
    } catch (err) {
      logger.error("Fetch users error", {
        error: err.message,
        user: req.user.username,
      });
      next(err);
    }
  }
);

export default router;
