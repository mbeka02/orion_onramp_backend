import logger from "../lib/logger";
import { db } from "../lib/db";
import {
  businesses,
  businessUsers,
  invitations,
  industries,
  categories,
  user,
} from "../lib/db/schema";
import { eq, and, desc, count, SQL } from "drizzle-orm";
import {
  BUSINESS_STATUS,
  USER_ROLES,
  USER_INVITATION_STATUS,
  BusinessType,
  Invitation,
  CreateBusinessType,
  UpdateBusinessType,
  Industry,
} from "../types/businesses";
import { Errors, MyError } from "../errors";

export class BusinessModel {
  async createDraft(
    business: CreateBusinessType,
    ownerId: string,
  ): Promise<string> {
    try {
      // Resolve industry/category ids: either use provided ids or create/find by name
      let finalIndustryId = business.industryId ?? null;
      if (!finalIndustryId && (business as any).industryName) {
        finalIndustryId = await this.findOrCreateIndustry(
          (business as any).industryName,
        );
      }

      let finalCategoryId = business.categoryId ?? null;
      if (!finalCategoryId && (business as any).categoryName) {
        // ensure we have an industry id to attach the category to
        if (!finalIndustryId) {
          throw new Error("Cannot create category without industry");
        }
        finalCategoryId = await this.findOrCreateCategory(
          (business as any).categoryName,
          finalIndustryId,
        );
      }

      const created = await db
        .insert(businesses)
        .values({
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
          businessRegistrationCertificate:
            business.businessRegistrationCertificate,
          businessRegistrationNumber: business.businessRegistrationNumber,
          status: BUSINESS_STATUS.DRAFT,
        })
        .returning({ id: businesses.id });

      const id = created[0].id;

      // Add owner as business user with ADMIN role
      await db.insert(businessUsers).values({
        businessId: id,
        userId: ownerId,
        role: USER_ROLES.ADMIN,
      });

      return id;
    } catch (err) {
      logger.error("Business Model Error: Error creating draft", {
        error: err,
        ownerId,
      });
      throw new Error("Error creating business draft");
    }
  }

  async updateBusiness(businessId: string, updates: UpdateBusinessType) {
    try {
      // Resolve industry/category ids if names are provided
      let finalIndustryId = updates.industryId ?? null;
      if (!finalIndustryId && (updates as any).industryName) {
        finalIndustryId = await this.findOrCreateIndustry(
          (updates as any).industryName,
        );
      }

      let finalCategoryId = updates.categoryId ?? null;
      if (!finalCategoryId && (updates as any).categoryName) {
        if (!finalIndustryId) {
          throw new Error("Cannot create category without industry");
        }
        finalCategoryId = await this.findOrCreateCategory(
          (updates as any).categoryName,
          finalIndustryId,
        );
      }

      // merge updates
      const updated = await db
        .update(businesses)
        .set({
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
          businessRegistrationCertificate:
            updates.businessRegistrationCertificate,
          businessRegistrationNumber: updates.businessRegistrationNumber,
        })
        .where(eq(businesses.id, businessId))
        .returning();
      return updated;
    } catch (err) {
      logger.error("Business Model Error: Error updating business", {
        error: err,
        businessId,
        updates,
      });
      throw new Error("Error updating business");
    }
  }

  // Create or find an industry by name and return its id
  async findOrCreateIndustry(name: string): Promise<string> {
    try {
      const rows = await db
        .select({ id: industries.id })
        .from(industries)
        .where(eq(industries.name, name));
      if (rows.length > 0) return rows[0].id;
      const created = await db
        .insert(industries)
        .values({ name })
        .returning({ id: industries.id });
      return created[0].id;
    } catch (err) {
      logger.error("Business Model Error: Error finding/creating industry", {
        error: err,
        name,
      });
      throw new Error("Error handling industry");
    }
  }

  // Create or find a category under a given industry and return its id
  async findOrCreateCategory(
    name: string,
    industryId: string,
  ): Promise<string> {
    try {
      const rows = await db
        .select({ id: categories.id })
        .from(categories)
        .where(
          and(eq(categories.name, name), eq(categories.industryId, industryId)),
        );
      if (rows.length > 0) return rows[0].id;
      const created = await db
        .insert(categories)
        .values({ name, industryId })
        .returning({ id: categories.id });
      return created[0].id;
    } catch (err) {
      logger.error("Business Model Error: Error finding/creating category", {
        error: err,
        name,
        industryId,
      });
      throw new Error("Error handling category");
    }
  }

  async submitForApproval(businessId: string, ownerId: string) {
    try {
      // set status to PENDING only if current status is DRAFT
      const result = await db
        .update(businesses)
        .set({ status: BUSINESS_STATUS.PENDING })
        .where(
          and(
            eq(businesses.id, businessId),
            eq(businesses.status, BUSINESS_STATUS.DRAFT),
          ),
        )
        .returning();
      return result;
    } catch (err) {
      logger.error(
        "Business Model Error: Error submitting business for approval",
        { error: err, businessId, ownerId },
      );
      throw new Error("Error submitting business for approval");
    }
  }
  async checkUserBusinessMembership(
    userId: string,
    businessId: string,
  ): Promise<boolean> {
    try {
      const [membership] = await db
        .select({ id: businessUsers.id })
        .from(businessUsers)
        .where(
          and(
            eq(businessUsers.userId, userId),
            eq(businessUsers.businessId, businessId),
          ),
        )
        .limit(1);
      return !!membership;
    } catch (err) {
      logger.error("Error checking business membership", {
        error: err,
        userId,
        businessId,
      });
      //  throw to ensure the caller handles the failure explicitly
      throw new Error("Failed to verify business membership", { cause: err });
    }
  }
  async isUserOwnerOrAdmin(
    businessId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      const ownerRows = await db
        .select({ owner: businesses.ownerId })
        .from(businesses)
        .where(eq(businesses.id, businessId));
      if (ownerRows.length > 0 && ownerRows[0].owner === userId) return true;

      const member = await db
        .select()
        .from(businessUsers)
        .where(
          and(
            eq(businessUsers.businessId, businessId),
            eq(businessUsers.userId, userId),
            eq(businessUsers.role, USER_ROLES.ADMIN),
          ),
        );
      return member.length > 0;
    } catch (err) {
      logger.error("Business Model Error: Error checking owner/admin", {
        error: err,
        businessId,
        userId,
      });
      throw new Error("Error checking permissions");
    }
  }

  async getInvitationById(invitationId: string) {
    try {
      const rows = await db
        .select()
        .from(invitations)
        .where(eq(invitations.id, invitationId));
      return rows.length > 0 ? rows[0] : null;
    } catch (err) {
      logger.error("Business Model Error: Error getting invitation", {
        error: err,
        invitationId,
      });
      throw new Error("Error getting invitation");
    }
  }

  async acceptInvitation(
    invitationId: string,
    userId: string,
    userEmail: string,
  ) {
    try {
      const invite = await this.getInvitationById(invitationId);
      if (!invite) throw new Error("Invitation not found");
      if (invite.status !== USER_INVITATION_STATUS.PENDING)
        throw new Error("Invitation not pending");
      if (invite.email !== userEmail)
        throw new Error("Invitation email does not match user email");

      // insert into business_users
      await db.insert(businessUsers).values({
        businessId: invite.businessId,
        userId,
        role: invite.role,
      });

      // update invitation status to Accepted
      await db
        .update(invitations)
        .set({ status: USER_INVITATION_STATUS.ACCEPTED })
        .where(eq(invitations.id, invitationId));
    } catch (err) {
      logger.error("Business Model Error: Error accepting invitation", {
        error: err,
        invitationId,
        userId,
      });
      throw new Error("Error accepting invitation");
    }
  }

  async isRegistrationNumberTaken(
    businessId: string | null,
    registrationNumber: string,
  ): Promise<boolean> {
    try {
      const rows = await db
        .select()
        .from(businesses)
        .where(eq(businesses.businessRegistrationNumber, registrationNumber));
      if (rows.length === 0) return false;
      // if businessId provided, ensure any row found is not the same business
      if (businessId) {
        return rows.some((r: any) => r.id !== businessId);
      }
      return true;
    } catch (err) {
      logger.error("Business Model Error: Error checking registration number", {
        error: err,
        businessId,
        registrationNumber,
      });
      throw new Error("Error checking registration number");
    }
  }

  async getBusinessesForUser(userId: string): Promise<BusinessType[]> {
    try {
      // Owned businesses with industry/category names
      const ownedRows = await db
        .select({
          biz: businesses,
          industryName: industries.name,
          categoryName: categories.name,
        })
        .from(businesses)
        .leftJoin(industries, eq(industries.id, businesses.industryId))
        .leftJoin(categories, eq(categories.id, businesses.categoryId))
        .where(eq(businesses.ownerId, userId));

      // Businesses where the user is a member
      const memberRows = await db
        .select({
          biz: businesses,
          industryName: industries.name,
          categoryName: categories.name,
        })
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

      // combine and deduplicate based on business ID
      const allBusinesses = [...owned, ...memberBizRows];
      const uniqueBusinesses = Array.from(
        new Map(allBusinesses.map((biz) => [biz.id, biz])).values(),
      );

      return uniqueBusinesses;
    } catch (err) {
      logger.error("Business Model Error: Error getting businesses for user", {
        error: err,
        userId,
      });
      throw new Error("Error getting businesses for user");
    }
  }

  async getBusinessById(businessId: string): Promise<BusinessType | null> {
    try {
      const rows = await db
        .select({
          biz: businesses,
          industryName: industries.name,
          categoryName: categories.name,
        })
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
      logger.error("Business Model Error: Error getting business by id", {
        error: err,
        businessId,
      });
      throw new Error("Error getting business");
    }
  }

  async deleteBusiness(businessId: string, actorId: string) {
    try {
      await db.delete(businesses).where(eq(businesses.id, businessId));
    } catch (err) {
      logger.error("Business Model Error: Error deleting business", {
        error: err,
        businessId,
        actorId,
      });
      throw new Error("Error deleting business");
    }
  }

  async inviteUser(
    businessId: string,
    invitedBy: string,
    email: string,
    role: string,
  ): Promise<string> {
    try {
      const created = await db
        .insert(invitations)
        .values({
          businessId,
          invitedBy,
          email,
          // cast to enum type expected by the schema
          role: role as unknown as USER_ROLES,
        })
        .returning({ id: invitations.id });

      return created[0].id;
    } catch (err) {
      logger.error("Business Model Error: Error inviting user", {
        error: err,
        businessId,
        invitedBy,
        email,
        role,
      });
      throw new Error("Error inviting user");
    }
  }

  async listInvitationsForBusiness(businessId: string): Promise<Invitation[]> {
    try {
      return await db
        .select()
        .from(invitations)
        .where(eq(invitations.businessId, businessId));
    } catch (err) {
      logger.error("Business Model Error: Error listing invitations", {
        error: err,
        businessId,
      });
      throw new Error("Error listing invitations");
    }
  }

  async cancelInvitation(invitationId: string, actorId: string) {
    try {
      // Fetch the invitation to verify it exists and get the business ID
      const [invitation] = await db
        .select()
        .from(invitations)
        .where(eq(invitations.id, invitationId));

      if (!invitation) {
        throw new Error("Invitation not found");
      }

      // Only pending invitations can be cancelled
      if (invitation.status !== USER_INVITATION_STATUS.PENDING) {
        throw new Error("Only pending invitations can be cancelled");
      }

      // Update invitation status to CANCELLED
      const [updated] = await db
        .update(invitations)
        .set({ status: USER_INVITATION_STATUS.CANCELLED })
        .where(eq(invitations.id, invitationId))
        .returning();

      logger.info("Invitation cancelled", { invitationId, actorId });
      return updated;
    } catch (err) {
      logger.error("Business Model Error: Error cancelling invitation", {
        error: err,
        invitationId,
        actorId,
      });
      throw new Error(
        err instanceof Error ? err.message : "Error cancelling invitation",
      );
    }
  }

  async getBusinessTeamMembers(businessId: string): Promise<
    Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      joinedAt: Date;
    }>
  > {
    try {
      const members = await db
        .select({
          id: businessUsers.id,
          name: user.name,
          email: user.email,
          role: businessUsers.role,
          joinedAt: businessUsers.joinedAt,
        })
        .from(businessUsers)
        .innerJoin(user, eq(businessUsers.userId, user.id))
        .where(eq(businessUsers.businessId, businessId));

      return members as Array<{
        id: string;
        name: string;
        email: string;
        role: string;
        joinedAt: Date;
      }>;
    } catch (err) {
      logger.error("Business Model Error: Error getting team members", {
        error: err,
        businessId,
      });
      throw new Error("Error getting team members");
    }
  }

  async removeTeamMember(
    businessId: string,
    memberId: string,
    actorId: string,
  ) {
    try {
      // Get business owner
      const [business] = await db
        .select({ ownerId: businesses.ownerId })
        .from(businesses)
        .where(eq(businesses.id, businessId));

      if (!business) {
        throw new Error("Business not found");
      }

      // Get the member being removed
      const [member] = await db
        .select()
        .from(businessUsers)
        .where(
          and(
            eq(businessUsers.id, memberId),
            eq(businessUsers.businessId, businessId),
          ),
        );

      if (!member) {
        throw new Error("Team member not found");
      }

      // Cannot remove the business owner
      if (member.userId === business.ownerId) {
        throw new Error("Cannot remove business owner from team");
      }

      // Delete the team member
      await db
        .delete(businessUsers)
        .where(
          and(
            eq(businessUsers.id, memberId),
            eq(businessUsers.businessId, businessId),
          ),
        );

      logger.info("Team member removed", { businessId, memberId, actorId });
    } catch (err) {
      logger.error("Business Model Error: Error removing team member", {
        error: err,
        businessId,
        memberId,
        actorId,
      });
      throw new Error(
        err instanceof Error ? err.message : "Error removing team member",
      );
    }
  }

  async getIndustriesAndCategories(): Promise<Industry[]> {
    try {
      const industriesWithCategories = await db
        .select({ industry: industries, categories: categories })
        .from(industries)
        .leftJoin(categories, eq(categories.industryId, industries.id))
        .orderBy(desc(industries.name));
      const results: Industry[] = [];
      industriesWithCategories.forEach((row) => {
        const industry = results.find((i) => i.id === row.industry.id);
        if (industry) {
          // add category to existing industry
          if (row.categories) {
            industry.categories.push({
              id: row.categories.id,
              name: row.categories.name,
            });
          }
        } else {
          // create new industry entry
          results.push({
            id: row.industry.id,
            name: row.industry.name,
            categories: row.categories
              ? [{ id: row.categories.id, name: row.categories.name }]
              : [],
          });
        }
      });
      return results;
    } catch (error) {
      logger.error(
        "Business Model Error: Error getting industries and categories",
        { error },
      );
      throw new Error("Error getting industries and categories");
    }
  }

  async isBusinessApproved(business_id: string): Promise<boolean> {
    try {
      const approved = await db
        .select({
          status: businesses.status,
        })
        .from(businesses)
        .where(eq(businesses.id, business_id))
        .limit(1);

      if (approved.length < 1) {
        throw new MyError(Errors.BUSINESS_NOT_FOUND);
      }

      return approved[0].status === BUSINESS_STATUS.APPROVED;
    } catch (err) {
      logger.error(
        "Business Model Error: Error checking if business is approved",
        { error: err, business_id },
      );
      if (err instanceof MyError) {
        throw err;
      }

      throw new Error("Could not check if business is approved");
    }
  }
  // Business Management Methods
  async getBusinessesByStatus(
    status?: BUSINESS_STATUS,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    businesses: BusinessType[];
    totalCount: number;
    totalPages: number;
  }> {
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
          businessRegistrationCertificate:
            businesses.businessRegistrationCertificate,
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
      const countQuery = db.select({ count: count() }).from(businesses);

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
        resultsCount: businessResults.length,
      });

      return {
        businesses: businessResults as BusinessType[],
        totalCount,
        totalPages,
      };
    } catch (error) {
      logger.error("Admin Model: Error getting businesses by status", {
        error,
        status,
        page,
        limit,
      });
      throw error;
    }
  }
}

const businessModel = new BusinessModel();
export default businessModel;
