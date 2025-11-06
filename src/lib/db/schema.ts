import { pgTable, pgEnum, text, timestamp, boolean, uuid, unique } from "drizzle-orm/pg-core";
import { ENVIRONMENT_TYPES } from "../../types/environments";

export const businessesTable = pgTable("businesses", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull()
});

export const environment = pgEnum("environment_types", [ENVIRONMENT_TYPES.LIVE, ENVIRONMENT_TYPES.TEST])

// Put database schemas here
export const environmentsTable = pgTable("environments", {
    id: uuid("id").primaryKey().defaultRandom(),
    businessID: uuid("business_id").notNull().references(() => businessesTable.id, {onDelete: "cascade"}),
    publicKey: text("public_key").notNull().unique(),
    privateKey: text("private_key").notNull().unique(),
    type: environment().notNull(),
    webhookUrl: text("webhook_url"),
    callbackUrl: text("callback_url")
}, (t) => [
  unique().on(t.businessID, t.type)
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
