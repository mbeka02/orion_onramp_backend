import logger from "../lib/logger";
import { db } from "../lib/db";
import { businesses, businessUsers, invitations } from "../lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { BUSINESS_STATUS, USER_ROLES, USER_INVITATION_STATUS, BusinessType, Invitation } from "../types/businesses";

export class BusinessModel {
    async createDraft(business: any, ownerId: string): Promise<string> {
        try {
            const created = await db.insert(businesses).values({
                ownerId,
                tradingName: business.tradingName,
                description: business.description,
                staffSize: business.staffSize,
                annualSalesVolume: business.annualSalesVolume,
                industry: business.industry,
                category: business.category,
                businessType: business.businessType,
                industryId: business.industryId,
                categoryId: business.categoryId,
                legalBusinessName: business.legalBusinessName,
                registrationtype: business.registrationtype,
                generalEmail: business.generalEmail,
                supportEmail: business.supportEmail,
                disputesemail: business.disputesemail,
                phoneNumber: business.phoneNumber,
                website: business.website,
                twitterHandle: business.twitterHandle,
                facebookPage: business.facebookPage,
                instagramHandle: business.instagramHandle,
                country: business.country,
                city: business.city,
                streetaddress: business.streetaddress,
                building: business.building,
                postalcode: business.postalcode,
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

    async updateBusiness(businessId: string, updates: any, actorId: string) {
        try {
            // merge updates
            const updated = await db.update(businesses).set({
                tradingName: updates.tradingName,
                description: updates.description,
                staffSize: updates.staffSize,
                annualSalesVolume: updates.annualSalesVolume,
                industry: updates.industry,
                category: updates.category,
                businessType: updates.businessType,
                industryId: updates.industryId,
                categoryId: updates.categoryId,
                legalBusinessName: updates.legalBusinessName,
                registrationtype: updates.registrationtype,
                generalEmail: updates.generalEmail,
                supportEmail: updates.supportEmail,
                disputesemail: updates.disputesemail,
                phoneNumber: updates.phoneNumber,
                website: updates.website,
                twitterHandle: updates.twitterHandle,
                facebookPage: updates.facebookPage,
                instagramHandle: updates.instagramHandle,
                country: updates.country,
                city: updates.city,
                streetaddress: updates.streetaddress,
                building: updates.building,
                postalcode: updates.postalcode,
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

    async submitForApproval(businessId: string, ownerId: string) {
        try {
            // set status to PENDING only if current status is DRAFT
            await db.update(businesses).set({ status: BUSINESS_STATUS.PENDING }).where(and(eq(businesses.id, businessId)));
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
            if (invite.status !== "Pending") throw new Error("Invitation not pending");
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
            const owned = await db.select().from(businesses).where(eq(businesses.ownerId, userId));
            // Get businesses where the user is a member via join
            const memberBusinesses = await db.select({ biz: businesses }).from(businesses)
                .innerJoin(businessUsers, eq(businessUsers.businessId, businesses.id))
                .where(eq(businessUsers.userId, userId));

            const memberBizRows = memberBusinesses.map((r: any) => r.biz);
            return [...owned, ...memberBizRows];
        } catch (err) {
            logger.error("Business Model Error: Error getting businesses for user", { error: err, userId });
            throw new Error("Error getting businesses for user");
        }
    }

    async getBusinessById(businessId: string): Promise<BusinessType | null> {
        try {
            const rows = await db.select().from(businesses).where(eq(businesses.id, businessId));
            return rows.length > 0 ? rows[0] as BusinessType : null;
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
