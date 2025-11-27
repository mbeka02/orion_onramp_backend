import { db } from "../lib/db";
import { admin, businesses, industries, categories } from "../lib/db/schema";
import { CreateAdminInput, LoginAdminInput, ROLE } from "../types/admin";
import { MyError, Errors } from "../errors";
import { eq, and, desc, count, SQL } from "drizzle-orm";
import bcrypt from "bcrypt";
import { BusinessType, BUSINESS_STATUS } from "../types/businesses";
import logger from "../lib/logger";
import { BusinessModel } from "./businesses";
export class AdminModel {
  private businessModel: BusinessModel;
  constructor(businessModel: BusinessModel) {
    this.businessModel = businessModel;
  }
  async setup() {
    try {
      const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD as string;
      const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL as string;
      if (!SUPERADMIN_EMAIL || !SUPERADMIN_PASSWORD) {
        logger.error(
          "Superadmin credentials are not set in environment variables.",
        );
        throw new MyError(
          "Superadmin credentials are not set in environment variables.",
        );
      }
      const doesSuperAdminExist = await this.doesAdminExist(SUPERADMIN_EMAIL);
      if (doesSuperAdminExist) {
        logger.info("Superadmin already exists. Skipping creation.");
        return;
      }
      const hashedPassword = bcrypt.hashSync(SUPERADMIN_PASSWORD, 10);
      const newAdmin = await db
        .insert(admin)
        .values({
          name: "Superadmin",
          email: SUPERADMIN_EMAIL,
          password: hashedPassword,
          role: ROLE.SUPER_ADMIN,
        })
        .returning();

      logger.info("Superadmin account created", {
        email: newAdmin[0].email,
        id: newAdmin[0].id,
      });
      return { email: newAdmin[0].email, id: newAdmin[0].id };
    } catch (error) {
      logger.error("Error during superadmin setup", { error });
      throw error;
    }
  }
  async createAdmin(args: CreateAdminInput) {
    try {
      const doesAdminExist = await this.doesAdminExist(args.email);
      if (doesAdminExist) {
        throw new MyError(Errors.ADMIN_ALREADY_EXISTS);
      }
      const newAdmin = await db
        .insert(admin)
        .values({
          name: args.name,
          email: args.email,
          password: args.password,
        })
        .returning();

      return { email: newAdmin[0].email, id: newAdmin[0].id };
    } catch (error) {
      throw error;
    }
  }

  async login(args: LoginAdminInput) {
    try {
      const admin = await this.getAdminByEmail(args.email);
      if (!admin) {
        throw new MyError(Errors.WRONG_ADMIN_CREDENTIALS);
      }
      const isPasswordValid = bcrypt.compareSync(args.password, admin.password);
      if (!isPasswordValid) {
        throw new MyError(Errors.WRONG_ADMIN_CREDENTIALS);
      }
      return admin;
    } catch (error) {
      throw error;
    }
  }
  private async doesAdminExist(email: string) {
    try {
      const existingAdmin = await db
        .select()
        .from(admin)
        .where(eq(admin.email, email));
      return existingAdmin.length > 0;
    } catch (error) {
      throw error;
    }
  }
  async getAdminByEmail(email: string) {
    try {
      const adminRecord = await db
        .select()
        .from(admin)
        .where(eq(admin.email, email));
      return adminRecord[0];
    } catch (error) {
      throw error;
    }
  }

  async approveBusiness(businessId: string, adminId: string): Promise<void> {
    try {
      // Check if business exists and is in pending status
      const business = await this.businessModel.getBusinessById(businessId);
      if (!business) {
        throw new MyError(Errors.BUSINESS_NOT_FOUND);
      }

      if (business.status !== BUSINESS_STATUS.PENDING) {
        throw new MyError("Business is not in pending status");
      }

      await db
        .update(businesses)
        .set({
          status: BUSINESS_STATUS.APPROVED,
        })
        .where(eq(businesses.id, businessId));

      logger.info("Admin approved business", {
        businessId,
        adminId,
        tradingName: business.tradingName,
      });
    } catch (error) {
      logger.error("Admin Model: Error approving business", {
        error,
        businessId,
        adminId,
      });
      throw error;
    }
  }

  async suspendBusiness(businessId: string, adminId: string): Promise<void> {
    try {
      // Check if business exists
      const business = await this.businessModel.getBusinessById(businessId);
      if (!business) {
        throw new MyError(Errors.BUSINESS_NOT_FOUND);
      }

      // Can only suspend active or pending businesses
      if (
        business.status !== BUSINESS_STATUS.APPROVED &&
        business.status !== BUSINESS_STATUS.PENDING
      ) {
        throw new MyError(
          "Business can only be suspended if it's approved or pending",
        );
      }

      await db
        .update(businesses)
        .set({
          status: BUSINESS_STATUS.SUSPENDED,
        })
        .where(eq(businesses.id, businessId));

      logger.info("Admin suspended business", {
        businessId,
        adminId,
        tradingName: business.tradingName,
        previousStatus: business.status,
      });
    } catch (error) {
      logger.error("Admin Model: Error suspending business", {
        error,
        businessId,
        adminId,
      });
      throw error;
    }
  }
  async getAdminById(adminId: string) {
    try {
      if (!adminId || !adminId.trim()) {
        throw new MyError("Admin ID is required");
      }
      const adminRecord = await db
        .select()
        .from(admin)
        .where(eq(admin.id, adminId));
      return adminRecord[0];
    } catch (error) {
      throw error;
    }
  }
}
