import logger from "../lib/logger";
import { db } from "../lib/db";
import { businesses, businessUsers, invitations, industries, categories } from "../lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { BUSINESS_STATUS, USER_ROLES, USER_INVITATION_STATUS, BusinessType, Invitation, CreateBusinessType, UpdateBusinessType } from "../types/businesses";

export class BusinessModel {
    async createDraft(business: CreateBusinessType, ownerId: string): Promise<string> {
        try {
            // Resolve industry/category ids: either use provided ids or create/find by name
            let finalIndustryId = business.industryId ?? null;
            if (!finalIndustryId && (business as any).industryName) {
                finalIndustryId = await this.findOrCreateIndustry((business as any).industryName);
            }

            let finalCategoryId = business.categoryId ?? null;
            if (!finalCategoryId && (business as any).categoryName) {
                // ensure we have an industry id to attach the category to
                if (!finalIndustryId) {
                    throw new Error("Cannot create category without industry");
                }
                finalCategoryId = await this.findOrCreateCategory((business as any).categoryName, finalIndustryId);
            }

            const created = await db.insert(businesses).values({
                ownerId,
                tradingName: business.tradingName,
                description: business.description,
                staffSize: business.staffSize,
                annualSalesVolume: business.annualSalesVolume,
                businessType: business.businessType,
                industryId: finalIndustryId,
                categoryId: finalCategoryId,
                legalBusinessName: business.legalBusinessName,
                registrationtype: business.registrationType,
                generalEmail: business.generalEmail,
                supportEmail: business.supportEmail,
                disputesemail: business.disputesEmail,
                phoneNumber: business.phoneNumber,
                website: business.website,
                twitterHandle: business.twitterHandle,
                facebookPage: business.facebookPage,
                instagramHandle: business.instagramHandle,
                country: business.country,
                city: business.city,
                streetaddress: business.streetAddress,
                building: business.building,
                postalcode: business.postalCode,
                cryptoWalletAddress: business.cryptoWalletAddress,
                revenuePin: business.revenuePin,
                businessRegistrationCertificate: business.businessRegistrationCertificate,
                businessRegistrationNumber: business.businessRegistrationNumber,
                status: BUSINESS_STATUS.DRAFT,
            }).returning({ id: businesses.id });

            const id = created[0].id;

            // Add owner as business user with ADMIN role
            await db.insert(businessUsers).values({
                businessId: id,
                userId: ownerId,
                role: USER_ROLES.ADMIN,
            });

            return id;
        } catch (err) {
            logger.error("Business Model Error: Error creating draft", { error: err, business, ownerId });
            throw new Error("Error creating business draft");
        }
    }

    async updateBusiness(businessId: string, updates: UpdateBusinessType, actorId: string) {
        try {
            // Resolve industry/category ids if names are provided
            let finalIndustryId = updates.industryId ?? null;
            if (!finalIndustryId && (updates as any).industryName) {
                finalIndustryId = await this.findOrCreateIndustry((updates as any).industryName);
            }

            let finalCategoryId = updates.categoryId ?? null;
            if (!finalCategoryId && (updates as any).categoryName) {
                if (!finalIndustryId) {
                    throw new Error("Cannot create category without industry");
                }
                finalCategoryId = await this.findOrCreateCategory((updates as any).categoryName, finalIndustryId);
            }

            // merge updates
            const updated = await db.update(businesses).set({
                tradingName: updates.tradingName,
                description: updates.description,
                staffSize: updates.staffSize,
                annualSalesVolume: updates.annualSalesVolume,
                businessType: updates.businessType,
                industryId: finalIndustryId,
                categoryId: finalCategoryId,
                legalBusinessName: updates.legalBusinessName,
                registrationtype: updates.registrationType,
                generalEmail: updates.generalEmail,
                supportEmail: updates.supportEmail,
                disputesemail: updates.disputesEmail,
                phoneNumber: updates.phoneNumber,
                website: updates.website,
                twitterHandle: updates.twitterHandle,
                facebookPage: updates.facebookPage,
                instagramHandle: updates.instagramHandle,
                country: updates.country,
                city: updates.city,
                streetaddress: updates.streetAddress,
                building: updates.building,
                postalcode: updates.postalCode,
                cryptoWalletAddress: updates.cryptoWalletAddress,
                revenuePin: updates.revenuePin,
                businessRegistrationCertificate: updates.businessRegistrationCertificate,
                businessRegistrationNumber: updates.businessRegistrationNumber,
            }).where(eq(businesses.id, businessId)).returning();
            return updated;
        } catch (err) {
            logger.error("Business Model Error: Error updating business", { error: err, businessId, updates, actorId });
            throw new Error("Error updating business");
        }
    }

    // Create or find an industry by name and return its id
    async findOrCreateIndustry(name: string): Promise<string> {
        try {
            const rows = await db.select({ id: industries.id }).from(industries).where(eq(industries.name, name));
            if (rows.length > 0) return rows[0].id;
            const created = await db.insert(industries).values({ name }).returning({ id: industries.id });
            return created[0].id;
        } catch (err) {
            logger.error("Business Model Error: Error finding/creating industry", { error: err, name });
            throw new Error("Error handling industry");
        }
    }

    // Create or find a category under a given industry and return its id
    async findOrCreateCategory(name: string, industryId: string): Promise<string> {
        try {
            const rows = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.name, name), eq(categories.industryId, industryId)));
            if (rows.length > 0) return rows[0].id;
            const created = await db.insert(categories).values({ name, industryId }).returning({ id: categories.id });
            return created[0].id;
        } catch (err) {
            logger.error("Business Model Error: Error finding/creating category", { error: err, name, industryId });
            throw new Error("Error handling category");
        }
    }

    async submitForApproval(businessId: string, ownerId: string) {
        try {
            // set status to PENDING only if current status is DRAFT
            await db.update(businesses).set({ status: BUSINESS_STATUS.PENDING }).where(and(eq(businesses.id, businessId), eq(businesses.status, BUSINESS_STATUS.DRAFT)));
        } catch (err) {
            logger.error("Business Model Error: Error submitting business for approval", { error: err, businessId, ownerId });
            throw new Error("Error submitting business for approval");
        }
    }

    async isUserOwnerOrAdmin(businessId: string, userId: string): Promise<boolean> {
        try {
            const ownerRows = await db.select({ owner: businesses.ownerId }).from(businesses).where(eq(businesses.id, businessId));
            if (ownerRows.length > 0 && ownerRows[0].owner === userId) return true;

            const member = await db.select().from(businessUsers).where(and(eq(businessUsers.businessId, businessId), eq(businessUsers.userId, userId), eq(businessUsers.role, USER_ROLES.ADMIN)));
            return member.length > 0;
        } catch (err) {
            logger.error("Business Model Error: Error checking owner/admin", { error: err, businessId, userId });
            throw new Error("Error checking permissions");
        }
    }

    async getInvitationById(invitationId: string) {
        try {
            const rows = await db.select().from(invitations).where(eq(invitations.id, invitationId));
            return rows.length > 0 ? rows[0] : null;
        } catch (err) {
            logger.error("Business Model Error: Error getting invitation", { error: err, invitationId });
            throw new Error("Error getting invitation");
        }
    }

    async acceptInvitation(invitationId: string, userId: string, userEmail: string) {
        try {
            const invite = await this.getInvitationById(invitationId);
            if (!invite) throw new Error("Invitation not found");
            if (invite.status !== USER_INVITATION_STATUS.PENDING) throw new Error("Invitation not pending");
            if (invite.email !== userEmail) throw new Error("Invitation email does not match user email");

            // insert into business_users
            await db.insert(businessUsers).values({
                businessId: invite.businessId,
                userId,
                role: invite.role,
            });

            // update invitation status to Accepted
            await db.update(invitations).set({ status: USER_INVITATION_STATUS.ACCEPTED }).where(eq(invitations.id, invitationId));
        } catch (err) {
            logger.error("Business Model Error: Error accepting invitation", { error: err, invitationId, userId });
            throw new Error("Error accepting invitation");
        }
    }

    async isRegistrationNumberTaken(businessId: string | null, registrationNumber: string): Promise<boolean> {
        try {
            const rows = await db.select().from(businesses).where(eq(businesses.businessRegistrationNumber, registrationNumber));
            if (rows.length === 0) return false;
            // if businessId provided, ensure any row found is not the same business
            if (businessId) {
                return rows.some((r: any) => r.id !== businessId);
            }
            return true;
        } catch (err) {
            logger.error("Business Model Error: Error checking registration number", { error: err, businessId, registrationNumber });
            throw new Error("Error checking registration number");
        }
    }

    async getBusinessesForUser(userId: string): Promise<BusinessType[]> {
        try {
            // Owned businesses with industry/category names
            const ownedRows = await db.select({ biz: businesses, industryName: industries.name, categoryName: categories.name })
                .from(businesses)
                .leftJoin(industries, eq(industries.id, businesses.industryId))
                .leftJoin(categories, eq(categories.id, businesses.categoryId))
                .where(eq(businesses.ownerId, userId));

            // Businesses where the user is a member
            const memberRows = await db.select({ biz: businesses, industryName: industries.name, categoryName: categories.name })
                .from(businesses)
                .innerJoin(businessUsers, eq(businessUsers.businessId, businesses.id))
                .leftJoin(industries, eq(industries.id, businesses.industryId))
                .leftJoin(categories, eq(categories.id, businesses.categoryId))
                .where(eq(businessUsers.userId, userId));

            const owned = ownedRows.map((r: any) => {
                const out = { ...r.biz } as any;
                // remove raw id fields from API output
                delete out.industryId;
                delete out.categoryId;
                out.industryName = r.industryName;
                out.categoryName = r.categoryName;
                return out as BusinessType;
            });

            const memberBizRows = memberRows.map((r: any) => {
                const out = { ...r.biz } as any;
                delete out.industryId;
                delete out.categoryId;
                out.industryName = r.industryName;
                out.categoryName = r.categoryName;
                return out as BusinessType;
            });
            return [...owned, ...memberBizRows];
        } catch (err) {
            logger.error("Business Model Error: Error getting businesses for user", { error: err, userId });
            throw new Error("Error getting businesses for user");
        }
    }

    async getBusinessById(businessId: string): Promise<BusinessType | null> {
        try {
            const rows = await db.select({ biz: businesses, industryName: industries.name, categoryName: categories.name })
                .from(businesses)
                .leftJoin(industries, eq(industries.id, businesses.industryId))
                .leftJoin(categories, eq(categories.id, businesses.categoryId))
                .where(eq(businesses.id, businessId));

            if (rows.length === 0) return null;
            const row = rows[0] as any;
            const biz = row.biz as any;
            const out = { ...biz } as any;
            delete out.industryId;
            delete out.categoryId;
            out.industryName = row.industryName;
            out.categoryName = row.categoryName;
            return out as BusinessType;
        } catch (err) {
            logger.error("Business Model Error: Error getting business by id", { error: err, businessId });
            throw new Error("Error getting business");
        }
    }

    async deleteBusiness(businessId: string, actorId: string) {
        try {
            await db.delete(businesses).where(eq(businesses.id, businessId));
        } catch (err) {
            logger.error("Business Model Error: Error deleting business", { error: err, businessId, actorId });
            throw new Error("Error deleting business");
        }
    }

    async inviteUser(businessId: string, invitedBy: string, email: string, role: string): Promise<string> {
        try {
            const created = await db.insert(invitations).values({
                businessId,
                invitedBy,
                email,
                // cast to enum type expected by the schema
                role: role as unknown as USER_ROLES,
            }).returning({ id: invitations.id });

            return created[0].id;
        } catch (err) {
            logger.error("Business Model Error: Error inviting user", { error: err, businessId, invitedBy, email, role });
            throw new Error("Error inviting user");
        }
    }

    async listInvitationsForBusiness(businessId: string): Promise<Invitation[]> {
        try {
            return await db.select().from(invitations).where(eq(invitations.businessId, businessId));
        } catch (err) {
            logger.error("Business Model Error: Error listing invitations", { error: err, businessId });
            throw new Error("Error listing invitations");
        }
    }
}

const businessModel = new BusinessModel();
export default businessModel;
