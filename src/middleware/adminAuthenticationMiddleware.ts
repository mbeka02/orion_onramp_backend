import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWTPayload, ROLE } from "../types/admin";
import logger from "../lib/logger";
import { Errors } from "../errors";

declare global {
  namespace Express {
    interface Request {
      adminId?: string;
      adminEmail?: string;
      role: ROLE;
    }
  }
}

export const adminAuthenticationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logger.warn(
        "Admin Authentication: Missing or invalid authorization header",
      );
      res.status(401).json({ error: Errors.UNAUTHORIZED });
      return;
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    const secretKey = process.env.JWT_SECRET_KEY as string;

    if (!secretKey) {
      logger.error("Admin Authentication: JWT_SECRET_KEY not configured");
      res.status(500).json({ error: Errors.INTERNAL_SERVER_ERROR });
      return;
    }

    const decoded = jwt.verify(token, secretKey) as JWTPayload;

    if (
      !decoded.adminId ||
      !decoded.email ||
      ![ROLE.ADMIN, ROLE.SUPER_ADMIN].includes(decoded.role)
    ) {
      logger.warn("Admin Authentication: Invalid token payload");
      res.status(401).json({ error: Errors.UNAUTHORIZED });
      return;
    }

    // Attach admin info to request
    req.adminId = decoded.adminId;
    req.adminEmail = decoded.email;
    req.role = decoded.role;

    logger.info("Admin authenticated successfully", {
      adminId: decoded.adminId,
      email: decoded.email,
      path: req.path,
      method: req.method,
    });

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn("Admin Authentication: Invalid JWT token", {
        error: error.message,
      });
      res.status(401).json({ error: Errors.UNAUTHORIZED });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      logger.warn("Admin Authentication: Expired JWT token");
      res.status(401).json({ error: Errors.UNAUTHORIZED });
      return;
    }

    logger.error("Admin Authentication: Unexpected error", { error });
    res.status(500).json({ error: Errors.INTERNAL_SERVER_ERROR });
  }
};
