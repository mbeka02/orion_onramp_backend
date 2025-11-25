import { db } from "../lib/db";
import { admin, businesses, industries, categories } from "../lib/db/schema";
import { CreateAdminInput, LoginAdminInput } from "../types/admin";
import { MyError, Errors } from "../errors";
import { eq, and, desc, count, SQL } from "drizzle-orm";
import bcrypt from "bcrypt";
import { BusinessType, BUSINESS_STATUS } from "../types/businesses";
import logger from "../lib/logger";
export class AdminModel {
    async createAdmin(args: CreateAdminInput) {
        try {
            const doesAdminExist = await this.doesAdminExist(args.email);
            if (doesAdminExist) {
                throw new MyError(Errors.ADMIN_ALREADY_EXISTS);
            }
            const newAdmin = await db.insert(admin).values({
                name: args.name,
                email: args.email,
                password: args.password,
            }).returning();

            return {email: newAdmin[0].email, id: newAdmin[0].id};
        }
        catch (error) {
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
        }
        catch (error) {
            throw error;
        }
    }
    private async doesAdminExist(email: string) {
        try {
            const existingAdmin = await db.select().from(admin).where(eq(admin.email, email));
            return existingAdmin.length > 0;
        }
        catch (error) {
            throw error;
        }
    }
    async getAdminByEmail(email: string) {
        try {
            const adminRecord = await db.select().from(admin).where(eq(admin.email, email));
            return adminRecord[0];
        }
        catch (error) {
            throw error;
        }
    }

    // Business Management Methods
    async getBusinessesByStatus(
        status?: BUSINESS_STATUS, 
        page: number = 1, 
        limit: number = 10
    ): Promise<{ businesses: BusinessType[], totalCount: number, totalPages: number }> {
        try {
            const offset = (page - 1) * limit;
            
            // Build where conditions
            const whereConditions: SQL[] = [];
            if (status) {
                whereConditions.push(eq(businesses.status, status));
            }

            // Get businesses with industry and category names
            const businessesQuery = db
                .select({
                    id: businesses.id,
                    ownerId: businesses.ownerId,
                    tradingName: businesses.tradingName,
                    description: businesses.description,
                    staffSize: businesses.staffSize,
                    annualSalesVolume: businesses.annualSalesVolume,
                    businessType: businesses.businessType,
                    industryName: industries.name,
                    categoryName: categories.name,
                    legalBusinessName: businesses.legalBusinessName,
                    registrationtype: businesses.registrationtype,
                    generalEmail: businesses.generalEmail,
                    supportEmail: businesses.supportEmail,
                    disputesEmail: businesses.disputesemail,
                    phoneNumber: businesses.phoneNumber,
                    website: businesses.website,
                    twitterHandle: businesses.twitterHandle,
                    facebookPage: businesses.facebookPage,
                    instagramHandle: businesses.instagramHandle,
                    country: businesses.country,
                    city: businesses.city,
                    streetaddress: businesses.streetaddress,
                    building: businesses.building,
                    postalcode: businesses.postalcode,
                    cryptoWalletAddress: businesses.cryptoWalletAddress,
                    revenuePin: businesses.revenuePin,
                    businessRegistrationCertificate: businesses.businessRegistrationCertificate,
                    businessRegistrationNumber: businesses.businessRegistrationNumber,
                    status: businesses.status,
                    createdAt: businesses.createdAt,
                })
                .from(businesses)
                .leftJoin(industries, eq(businesses.industryId, industries.id))
                .leftJoin(categories, eq(businesses.categoryId, categories.id))
                .orderBy(desc(businesses.createdAt))
                .limit(limit)
                .offset(offset);

            // Apply where conditions if any
            if (whereConditions.length > 0) {
                businessesQuery.where(and(...whereConditions));
            }

            const businessResults = await businessesQuery;

            // Get total count
            const countQuery = db
                .select({ count: count() })
                .from(businesses);
            
            if (whereConditions.length > 0) {
                countQuery.where(and(...whereConditions));
            }

            const countResult = await countQuery;
            const totalCount = countResult[0].count;
            const totalPages = Math.ceil(totalCount / limit);

            logger.info("Admin fetched businesses", {
                status,
                page,
                limit,
                totalCount,
                resultsCount: businessResults.length
            });

            return {
                businesses: businessResults as BusinessType[],
                totalCount,
                totalPages
            };
        } catch (error) {
            logger.error("Admin Model: Error getting businesses by status", { error, status, page, limit });
            throw error;
        }
    }

    async getBusinessById(businessId: string): Promise<BusinessType | null> {
        try {
            const businessResult = await db
                .select({
                    id: businesses.id,
                    ownerId: businesses.ownerId,
                    tradingName: businesses.tradingName,
                    description: businesses.description,
                    staffSize: businesses.staffSize,
                    annualSalesVolume: businesses.annualSalesVolume,
                    businessType: businesses.businessType,
                    industryName: industries.name,
                    categoryName: categories.name,
                    legalBusinessName: businesses.legalBusinessName,
                    registrationtype: businesses.registrationtype,
                    generalEmail: businesses.generalEmail,
                    supportEmail: businesses.supportEmail,
                    disputesEmail: businesses.disputesemail,
                    phoneNumber: businesses.phoneNumber,
                    website: businesses.website,
                    twitterHandle: businesses.twitterHandle,
                    facebookPage: businesses.facebookPage,
                    instagramHandle: businesses.instagramHandle,
                    country: businesses.country,
                    city: businesses.city,
                    streetaddress: businesses.streetaddress,
                    building: businesses.building,
                    postalcode: businesses.postalcode,
                    cryptoWalletAddress: businesses.cryptoWalletAddress,
                    revenuePin: businesses.revenuePin,
                    businessRegistrationCertificate: businesses.businessRegistrationCertificate,
                    businessRegistrationNumber: businesses.businessRegistrationNumber,
                    status: businesses.status,
                    createdAt: businesses.createdAt,
                })
                .from(businesses)
                .leftJoin(industries, eq(businesses.industryId, industries.id))
                .leftJoin(categories, eq(businesses.categoryId, categories.id))
                .where(eq(businesses.id, businessId));

            const business = businessResult[0];
            if (!business) {
                return null;
            }

            logger.info("Admin fetched business by ID", { businessId });
            return business as BusinessType;
        } catch (error) {
            logger.error("Admin Model: Error getting business by ID", { error, businessId });
            throw error;
        }
    }

    async approveBusiness(businessId: string, adminId: string): Promise<void> {
        try {
            // Check if business exists and is in pending status
            const business = await this.getBusinessById(businessId);
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
                tradingName: business.tradingName 
            });
        } catch (error) {
            logger.error("Admin Model: Error approving business", { error, businessId, adminId });
            throw error;
        }
    }

    async suspendBusiness(businessId: string, adminId: string): Promise<void> {
        try {
            // Check if business exists
            const business = await this.getBusinessById(businessId);
            if (!business) {
                throw new MyError(Errors.BUSINESS_NOT_FOUND);
            }

            // Can only suspend active or pending businesses
            if (business.status !== BUSINESS_STATUS.APPROVED && business.status !== BUSINESS_STATUS.PENDING) {
                throw new MyError("Business can only be suspended if it's approved or pending");
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
                previousStatus: business.status 
            });
        } catch (error) {
            logger.error("Admin Model: Error suspending business", { error, businessId, adminId });
            throw error;
        }
    }
}