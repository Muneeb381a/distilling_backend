import { pool } from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import logger from "../utils/logger.js";

dotenv.config();

// Validate user input for registration
const validateUserInput = (
  { username, password, name, email },
  isSetup = false
) => {
  if (!username || !password || !name || !email) {
    throw new ApiError(400, "Username, password, name, and email are required");
  }
  if (!/^[a-zA-Z0-9]{3,30}$/.test(username)) {
    throw new ApiError(400, "Username must be 3-30 alphanumeric characters");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, "Invalid email format");
  }
  if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(password)) {
    throw new ApiError(
      400,
      "Password must be 8+ characters with a letter and number"
    );
  }
};

const login = async (req, res, next) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
      logger.error("Login failed: Missing fields", {
        username: username || "undefined",
        role: role || "undefined",
      });
      throw new ApiError(400, "Username, password, and role are required");
    }

    if (!["admin", "supervisor"].includes(role)) {
      logger.error("Login failed: Invalid role", { username, role });
      throw new ApiError(400, "Role must be admin or supervisor");
    }

    const { rows } = await pool.query(
      "SELECT * FROM users WHERE (username = $1 OR email = $1) AND role = $2",
      [username, role]
    );
    const user = rows[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      logger.error("Login failed: Invalid credentials", { username, role });
      throw new ApiError(401, "Invalid credentials");
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    logger.info("Login successful", { username, role });
    return res
      .status(200)
      .json(new ApiResponse(200, { token, role }, "Login successful"));
  } catch (err) {
    logger.error("Login error", {
      error: err.message,
      username: req.body.username || "undefined",
    });
    next(err);
  }
};

const registerUser = async (req, role, res, next) => {
  try {
    const { username, password, name, email } = req.body;
    validateUserInput({ username, password, name, email });

    const { rows: existing } = await pool.query(
      "SELECT * FROM users WHERE username = $1 OR email = $2",
      [username, email]
    );
    if (existing.length > 0) {
      logger.error(`${role} registration failed: Username or email exists`, {
        username,
        email,
      });
      throw new ApiError(400, "Username or email already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      "INSERT INTO users (username, password, role, name, email, updated_at) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP) RETURNING id, username, role, name, email",
      [username, hashedPassword, role, name, email]
    );

    logger.info(`${role} registered successfully`, { username, role, email });
    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { user: rows[0] },
          `${role} registered successfully`
        )
      );
  } catch (err) {
    logger.error(`${role} registration error`, {
      error: err.message,
      username: req.body.username || "undefined",
    });
    next(err);
  }
};

const registerAdmin = (req, res, next) => registerUser(req, "admin", res, next);
const registerSupervisor = (req, res, next) =>
  registerUser(req, "supervisor", res, next);

export { login, registerAdmin, registerSupervisor };
