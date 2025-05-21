import dotenv from "dotenv";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import logger from "../utils/logger.js";
import { pool } from "../config/db.js";

dotenv.config();

const login = async (req, res, next) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
      logger.error("Login failed: Mising requirted fields", { username, role });
      throw new ApiError(400, "Username, password and role are required");
    }

    const { rows } = await pool.query(
      "SELECT * FROM users WHERE username = $1 AND role = $2",
      [username, role]
    );
    const user = rows[0];

    if (!user) {
      logger.error("Login failed: User not found", { username, role });
      throw new ApiError(401, "Invalid credentials");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logger.error("Login failed: Incorrect Password", { username, role });
      throw new ApiError(401, "Invalid credentials");
    }

    const token = JsonWebTokenError.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    logger.info("Login Succesful", { username, role });
    return res
      .status(200)
      .json(new ApiResponse(200, { token, role }, "Login Succesfull"));
  } catch (err) {
    next(err);
  }
};

export { login };
