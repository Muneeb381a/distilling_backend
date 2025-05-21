import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import {ApiError} from "../utils/ApiError.js";

dotenv.config();

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split("Bearer ")[1];
  if (!token) {
    return next(new ApiError(401, "Unauthorized: No token provided"));
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    return next(new ApiError(401, "Unauthorized: Invalid token"));
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user.role !== "admin") {
    return next(new ApiError(403, "Forbidden: Admin access required"));
  }
  next();
};

export { authMiddleware, adminMiddleware };
