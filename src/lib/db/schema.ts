import { pgTable, primaryKey, pgEnum, text, timestamp, boolean, uuid, unique } from "drizzle-orm/pg-core";
import { ENVIRONMENT_TYPES } from "../../types/environments";
import { BUSINESS_TYPES, BUSINESS_REGISTRATION_TYPES, BUSINESS_STATUS, USER_ROLES, USER_INVITATION_STATUS } from "../../types/businesses";
import { relations } from "drizzle-orm";
export const businessesTable = pgTable("businesses", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull()
});

export const environment = pgEnum("environment_types", [ENVIRONMENT_TYPES.LIVE, ENVIRONMENT_TYPES.TEST])
export const role = pgEnum("user_role", [USER_ROLES.ADMIN, USER_ROLES.DEVELOPER, USER_ROLES.FINANCE, USER_ROLES.SUPPORT])
export const invitationStatus = pgEnum("invitation_status", [USER_INVITATION_STATUS.PENDING, USER_INVITATION_STATUS.ACCEPTED, USER_INVITATION_STATUS.REJECTED, USER_INVITATION_STATUS.EXPIRED, USER_INVITATION_STATUS.CANCELLED])
export const environmentsTable = pgTable("environments", {
  id: uuid("id").primaryKey().defaultRandom(),
  businessID: uuid("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
  type: environment().notNull(),
  webhookUrl: text("webhook_url"),
  callbackUrl: text("callback_url")
}, (t) => [
  unique().on(t.businessID, t.type)
]);

export const environmentKeysTable = pgTable("environment_keys", {
  environmentID: uuid("environment_id").references(() => environmentsTable.id, { onDelete: "cascade" }).notNull(),
  publicKey: text("public_key").notNull().unique(),
  privateKey: text("private_key").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at") // If set it means a new key has been created for environment
}, (table) => [
  primaryKey({ columns: [table.environmentID, table.privateKey, table.publicKey] })
])

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  businessName: text("business_name").notNull(),
  phoneNumber: text("phone_number").notNull(),
  country: text("country").default("Kenya"),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});
export const industries = pgTable("industries", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom(),
  industryId: uuid("industry_id")
    .notNull()
    .references(() => industries.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  primaryKey({
    columns: [table.id, table.industryId],
  }),
]);
export const businesses = pgTable("businesses", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  tradingName: text("trading_name"),
  description: text("description"),
  staffSize: text("staff_size"),
  annualSalesVolume: text("annual_sales_volume"),
  industry: text("industry"),
  category: text("category"),
  businessType: pgEnum("business_type", [BUSINESS_TYPES.STARTER, BUSINESS_TYPES.REGISTERED])(),
  industryId: uuid("industry_id")
    .references(() => industries.id, { onDelete: "set null" }),
  categoryId: uuid("category_id")
    .references(() => categories.id, { onDelete: "set null" }),
  legalBusinessName: text("legal_business_name"),
  registrationtype: pgEnum("business_registration_type", [BUSINESS_REGISTRATION_TYPES.SOLE_PROPRIETORSHIP, BUSINESS_REGISTRATION_TYPES.REGISTERED_COMPANY])(),
  generalEmail: text("general_email"),
  supportEmail: text("support_email"),
  disputesemail: text("disputes_email"),
  phoneNumber: text("phone_number"),
  website: text("website"),
  twitterHandle: text("twitter_handle"),
  facebookPage: text("facebook_page"),
  instagramHandle: text("instagram_handle"),
  country: text("country"),
  city: text("city"),
  streetaddress: text("street_address"),
  building: text("building"),
  postalcode: text("postal_code"),
  cryptoWalletAddress: text("crypto_wallet_address"),
  revenuePin: text("revenue_pin"),
  businessRegistrationCertificate: text("registration_certificate"),
  businessRegistrationNumber: text("registration_number"),
  status: pgEnum("business_status", [BUSINESS_STATUS.DRAFT, BUSINESS_STATUS.PENDING, BUSINESS_STATUS.APPROVED, BUSINESS_STATUS.REJECTED, BUSINESS_STATUS.SUSPENDED])().default(BUSINESS_STATUS.DRAFT),
  createdAt: timestamp("created_at").defaultNow(),
})
export const businessUsers = pgTable("business_users", {
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }).primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  role: role(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});
export const invitations = pgTable("invitations", {
  id: uuid("id").defaultRandom().primaryKey(),
  businessId: uuid("business_id")
    .notNull()
    .references(() => businesses.id, { onDelete: "cascade" }),
  invitedBy: text("invited_by")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: role().notNull(),
  status: invitationStatus().default(USER_INVITATION_STATUS.PENDING).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const industriesRelations = relations(industries, ({ many }) => ({
  categories: many(categories),
}));
export const categoriesRelations = relations(categories, ({ one }) => ({
  industry: one(industries, {
    fields: [categories.industryId],
    references: [industries.id],
  }),
}));

export const businessesRelations = relations(businesses, ({ one, many }) => ({
  industry: one(industries, {
    fields: [businesses.industryId],
    references: [industries.id],
  }),
  category: one(categories, {
    fields: [businesses.categoryId],
    references: [categories.id],
  }),
  owner: one(user, {
    fields: [businesses.ownerId],
    references: [user.id],
  }),
  members: many(businessUsers),
}));

export const usersRelations = relations(user, ({ many }) => ({
  businesses: many(businessUsers),
  ownedBusinesses: many(businesses),
}));
export const businessUsersRelations = relations(businessUsers, ({ one }) => ({
  user: one(user, {
    fields: [businessUsers.userId],
    references: [user.id],
  }),
  business: one(businesses, {
    fields: [businessUsers.businessId],
    references: [businesses.id],
  }),
}));