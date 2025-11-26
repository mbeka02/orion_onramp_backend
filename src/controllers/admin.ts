import { AdminModel } from "../models/admin";
import {
  CreateAdminInput,
  LoginAdminInput,
  JWTPayload,
  ROLE,
} from "../types/admin";
import { MyError, Errors } from "../errors";
import logger from "../lib/logger";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { BUSINESS_STATUS } from "../types/businesses";
const SALT_ROUNDS = 10;
export class Admincontroller {
  async setup() {
    const model = new AdminModel();
    try {
      await model.setup();
    } catch (error) {
      logger.error("Admin Controller: Error during setup", { error });
      if (error instanceof MyError) {
        throw error;
      }
      throw new Error(Errors.INTERNAL_SERVER_ERROR);
    }
  }
  async createadmin(args: CreateAdminInput, model: AdminModel) {
    try {
      const hashPassword = this.hashPassword(args.password);
      const admin = await model.createAdmin({
        ...args,
        password: hashPassword,
      });
      const token = this.generateToken(admin.id, admin.email, ROLE.ADMIN);
      return { admin, token };
    } catch (err) {
      if (err instanceof MyError) throw err;
      logger.error("Admin Controller: Error creating admin", { err, args });
      throw new Error(Errors.INTERNAL_SERVER_ERROR);
    }
  }
  async login(args: LoginAdminInput, model: AdminModel) {
    try {
      const admin = await model.login(args);
      const token = this.generateToken(
        admin.id,
        admin.email,
        admin.role as ROLE,
      );
      return { admin, token };
    } catch (err) {
      if (err instanceof MyError) throw err;
      logger.error("Admin Controller: Error logging in admin", { err, args });
      throw new Error(Errors.INTERNAL_SERVER_ERROR);
    }
  }
  private hashPassword(password: string): string {
    const salt = bcrypt.genSaltSync(SALT_ROUNDS);
    return bcrypt.hashSync(password, salt);
  }
  private generateToken(adminId: string, email: string, role: ROLE): string {
    const secretKey = process.env.JWT_SECRET_KEY as string;
    if (!secretKey) {
      throw new Error("JWT secret key is not defined in environment variables");
    }
    const payload: JWTPayload = { adminId, email, role };
    return jwt.sign(payload, secretKey, { expiresIn: "7d" });
  }

  // Business Management Methods
  async getBusinessesByStatus(
    status: BUSINESS_STATUS | undefined,
    page: number,
    limit: number,
    model: AdminModel,
  ) {
    try {
      // Validate pagination parameters
      if (page < 1) {
        throw new MyError("Page must be greater than 0");
      }
      if (limit < 1 || limit > 100) {
        throw new MyError("Limit must be between 1 and 100");
      }

      const result = await model.getBusinessesByStatus(status, page, limit);

      logger.info("Admin Controller: Successfully retrieved businesses", {
        status,
        page,
        limit,
        totalCount: result.totalCount,
        resultsCount: result.businesses.length,
      });

      return result;
    } catch (err) {
      if (err instanceof MyError) {
        throw err;
      }
      logger.error("Admin Controller: Error getting businesses by status", {
        err,
        status,
        page,
        limit,
      });
      throw new Error(Errors.INTERNAL_SERVER_ERROR);
    }
  }

  async getBusinessById(businessId: string, model: AdminModel) {
    try {
      if (!businessId || !businessId.trim()) {
        throw new MyError("Business ID is required");
      }

      const business = await model.getBusinessById(businessId);
      if (!business) {
        throw new MyError(Errors.BUSINESS_NOT_FOUND);
      }

      logger.info("Admin Controller: Successfully retrieved business", {
        businessId,
      });
      return business;
    } catch (err) {
      if (err instanceof MyError) {
        throw err;
      }
      logger.error("Admin Controller: Error getting business by ID", {
        err,
        businessId,
      });
      throw new Error(Errors.INTERNAL_SERVER_ERROR);
    }
  }

  async approveBusiness(
    businessId: string,
    adminId: string,
    model: AdminModel,
  ) {
    try {
      if (!businessId || !businessId.trim()) {
        throw new MyError("Business ID is required");
      }
      if (!adminId || !adminId.trim()) {
        throw new MyError("Admin ID is required");
      }
      await model.approveBusiness(businessId, adminId);

      logger.info("Admin Controller: Successfully approved business", {
        businessId,
        adminId,
      });

      return { message: "Business approved successfully" };
    } catch (err) {
      if (err instanceof MyError) {
        throw err;
      }
      logger.error("Admin Controller: Error approving business", {
        err,
        businessId,
        adminId,
      });
      throw new Error(Errors.INTERNAL_SERVER_ERROR);
    }
  }

  async suspendBusiness(
    businessId: string,
    adminId: string,
    model: AdminModel,
  ) {
    try {
      if (!businessId || !businessId.trim()) {
        throw new MyError("Business ID is required");
      }
      if (!adminId || !adminId.trim()) {
        throw new MyError("Admin ID is required");
      }
      await model.suspendBusiness(businessId, adminId);

      logger.info("Admin Controller: Successfully suspended business", {
        businessId,
        adminId,
      });

      return { message: "Business suspended successfully" };
    } catch (err) {
      if (err instanceof MyError) {
        throw err;
      }
      logger.error("Admin Controller: Error suspending business", {
        err,
        businessId,
        adminId,
      });
      throw new Error(Errors.INTERNAL_SERVER_ERROR);
    }
  }
}
