import { z } from "zod";

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


export const createBusinessSchema = z.object({
    tradingName: z.string().min(1).optional(),
    description: z.string().optional(),
    staffSize: z.string().optional(),
    annualSalesVolume: z.string().optional(),
    industryName: z.string().optional(),
    categoryName: z.string().optional(),
    businessType: z.enum([BUSINESS_TYPES.STARTER, BUSINESS_TYPES.REGISTERED]).optional(),
    industryId: z.uuid().optional().nullable(),
    categoryId: z.uuid().optional().nullable(),
    legalBusinessName: z.string().optional(),
    registrationType: z.enum([BUSINESS_REGISTRATION_TYPES.SOLE_PROPRIETORSHIP, BUSINESS_REGISTRATION_TYPES.REGISTERED_COMPANY]).optional(),
    generalEmail: z.email().optional().or(z.literal('')),
    supportEmail: z.email().optional().or(z.literal('')),
    disputesEmail: z.email().optional().or(z.literal('')),
    phoneNumber: z.string().optional(),
    website: z.string().optional(),
    twitterHandle: z.string().optional(),
    facebookPage: z.string().optional(),
    instagramHandle: z.string().optional(),
    country: z.string().optional(),
    city: z.string().optional(),
    streetAddress: z.string().optional(),
    building: z.string().optional(),
    postalCode: z.string().optional(),
    cryptoWalletAddress: z.string().optional(),
    revenuePin: z.string().optional(),
    businessRegistrationCertificate: z.string().optional(),
    businessRegistrationNumber: z.string().optional(),
});

// When submitting for approval, require essential fields to be present
export const submitBusinessForApprovalSchema = createBusinessSchema.extend({
    tradingName: z.string().min(1),
    legalBusinessName: z.string().min(1),
    registrationType: z.enum([BUSINESS_REGISTRATION_TYPES.SOLE_PROPRIETORSHIP, BUSINESS_REGISTRATION_TYPES.REGISTERED_COMPANY]),
    businessRegistrationNumber: z.string().min(1),
    generalEmail: z.email(),
});

export const updateBusinessSchema = createBusinessSchema.extend({
    id: z.uuid()
});

export const inviteUserSchema = z.object({
    email: z.email(),
    role: z.enum([USER_ROLES.ADMIN, USER_ROLES.DEVELOPER, USER_ROLES.FINANCE, USER_ROLES.SUPPORT])
});
export interface BusinessType {
    id: string;
    ownerId: string;
    tradingName?: string;
    description?: string;
    staffSize?: string;
    annualSalesVolume?: string;
    businessType?: BUSINESS_TYPES;
    legalBusinessName?: string;
    registrationtype?: BUSINESS_REGISTRATION_TYPES;
    generalEmail?: string;
    supportEmail?: string;
    disputesEmail?: string;
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
    // prefer returning the resolved names instead of raw ids
    industryName?: string;
    categoryName?: string;
    status: BUSINESS_STATUS;
    createdAt: Date;
    updatedAt?: Date;
}
export interface Invitation {
    id: string;
    businessId: string;
    invitedBy: string;
    email: string;
    role: USER_ROLES;
    status: USER_INVITATION_STATUS;
    createdAt: Date;
}
export interface Category {
    id: string;
    name: string;
}
export interface Industry {
    id: string;
    name: string;
    categories: Category[];
}
export type CreateBusinessType = z.infer<typeof createBusinessSchema>;
export type SubmitBusinessType = z.infer<typeof submitBusinessForApprovalSchema>;
export type UpdateBusinessType = z.infer<typeof updateBusinessSchema>;
export type InviteUserType = z.infer<typeof inviteUserSchema>;
