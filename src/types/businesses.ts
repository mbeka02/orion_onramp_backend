export enum BUSINESS_TYPES {
    STARTER = "Starter business",
    REGISTERED = "Registered Business",
}
export enum BUSINESS_REGISTRATION_TYPES {
    SOLE_PROPRIETORSHIP = "Sole Proprietorship",
    REGISTERED_COMPANY = "Registered Company",
}
export enum BUSINESS_STATUS {
    DRAFT = "Draft",
    PENDING = "Pending",
    APPROVED = "Approved",
    REJECTED = "Rejected",
    SUSPENDED = "Suspended",
}
export enum USER_ROLES {
    ADMIN = "Admin",
    DEVELOPER = "Developer",
    FINANCE = "Finance",
    SUPPORT = "Support",
}
export enum USER_INVITATION_STATUS {
    PENDING = "Pending",
    ACCEPTED = "Accepted",
    REJECTED = "Rejected",
    EXPIRED = "Expired",
    CANCELLED = "Cancelled",
}

// Zod schemas and request/response types for businesses
import { z } from "zod";

export const createBusinessSchema = z.object({
    tradingName: z.string().min(1).optional(),
    description: z.string().optional(),
    staffSize: z.string().optional(),
    annualSalesVolume: z.string().optional(),
    industry: z.string().optional(),
    category: z.string().optional(),
    businessType: z.enum([BUSINESS_TYPES.STARTER, BUSINESS_TYPES.REGISTERED]).optional(),
    industryId: z.string().uuid().optional().nullable(),
    categoryId: z.string().uuid().optional().nullable(),
    legalBusinessName: z.string().optional(),
    registrationtype: z.enum([BUSINESS_REGISTRATION_TYPES.SOLE_PROPRIETORSHIP, BUSINESS_REGISTRATION_TYPES.REGISTERED_COMPANY]).optional(),
    generalEmail: z.string().email().optional(),
    supportEmail: z.string().email().optional(),
    disputesemail: z.string().email().optional(),
    phoneNumber: z.string().optional(),
    website: z.string().optional(),
    twitterHandle: z.string().optional(),
    facebookPage: z.string().optional(),
    instagramHandle: z.string().optional(),
    country: z.string().optional(),
    city: z.string().optional(),
    streetaddress: z.string().optional(),
    building: z.string().optional(),
    postalcode: z.string().optional(),
    cryptoWalletAddress: z.string().optional(),
    revenuePin: z.string().optional(),
    businessRegistrationCertificate: z.string().optional(),
    businessRegistrationNumber: z.string().optional(),
});

// When submitting for approval, require essential fields to be present
export const submitBusinessForApprovalSchema = createBusinessSchema.extend({
    tradingName: z.string().min(1),
    legalBusinessName: z.string().min(1),
    registrationtype: z.enum([BUSINESS_REGISTRATION_TYPES.SOLE_PROPRIETORSHIP, BUSINESS_REGISTRATION_TYPES.REGISTERED_COMPANY]),
    businessRegistrationNumber: z.string().min(1),
    generalEmail: z.string().email(),
});

export const updateBusinessSchema = createBusinessSchema.extend({
    id: z.string().uuid()
});

export const inviteUserSchema = z.object({
    email: z.string().email(),
    role: z.enum([USER_ROLES.ADMIN, USER_ROLES.DEVELOPER, USER_ROLES.FINANCE, USER_ROLES.SUPPORT])
});
export interface BusinessType {
    id: string;
    ownerId: string;
    tradingName?: string;
    description?: string;
    staffSize?: string;
    annualSalesVolume?: string;
    industry?: string;
    category?: string;
    businessType?: BUSINESS_TYPES;
    industryId?: string | null;
    categoryId?: string | null;
    legalBusinessName?: string;
    registrationtype?: BUSINESS_REGISTRATION_TYPES;
    generalEmail?: string;
    supportEmail?: string;
    disputesemail?: string;
    phoneNumber?: string;
    website?: string;
    twitterHandle?: string;
    facebookPage?: string;
    instagramHandle?: string;
    country?: string;
    city?: string;
    streetaddress?: string;
    building?: string;
    postalcode?: string;
    cryptoWalletAddress?: string;
    revenuePin?: string;
    businessRegistrationCertificate?: string;
    businessRegistrationNumber?: string;
    status: BUSINESS_STATUS;
    createdAt: Date;
    updatedAt: Date;
}
export interface Invitation{
    id: string;
    businessId: string;
    invitedBy: string;
    email: string;
    role: USER_ROLES;
    status: USER_INVITATION_STATUS;
    createdAt: Date;
}

export type CreateBusinessType = z.infer<typeof createBusinessSchema>;
export type SubmitBusinessType = z.infer<typeof submitBusinessForApprovalSchema>;
export type UpdateBusinessType = z.infer<typeof updateBusinessSchema>;
export type InviteUserType = z.infer<typeof inviteUserSchema>;
