import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { ApiError } from "../utils/ApiError.js";


dotenv.config();

const authMiddleware = (req, res, next) => {
    const token = req.headers.authorzation?.split('Bearer ')[1];
    if(!token) {
        return next(new ApiError(401, 'Unathorized No tokn provided'))
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;

        next();
    } catch (error) {
        return next(new ApiError(401, 'Unauthorized: Invalid Token'))
    }
};

const adminMiddleware = (req, res, next) => {
    if(req.user.role !== 'admin') {
        return next(new ApiError(403, 'Forbidden: Admin Access required'))
    }
    next();
};

export {authMiddleware, adminMiddleware}