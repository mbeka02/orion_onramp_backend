import {
  pgTable,
  pgEnum,
  primaryKey,
  text,
  timestamp,
  boolean,
  uuid,
  unique,
  bigint,
  varchar,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";

import { ENVIRONMENT_TYPES } from "../../types/environments";
import { TRANSACTION_STATUS } from "../../types/transactions";
import {TOKEN_TYPE} from "../../types/token";
import { SUPPORTED_CHAINS } from "../../types/chain";
export const businessesTable = pgTable("businesses", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
});

export const environment = pgEnum("environment_types", [
  ENVIRONMENT_TYPES.LIVE,
  ENVIRONMENT_TYPES.TEST,
]);
export const token_type = pgEnum("token", [
  TOKEN_TYPE.KESy_TESTNET,
  TOKEN_TYPE.KESy_MAINNET,
]);

export const chain_enum = pgEnum("chain_enum", [
  SUPPORTED_CHAINS.HEDERA_MAINNET,
  SUPPORTED_CHAINS.HEDERA_TESTNET
])

export const transaction_status = pgEnum("transaction_status", [
  TRANSACTION_STATUS.PENDING,
  TRANSACTION_STATUS.SUCCESSFUL,
  TRANSACTION_STATUS.FAILED,
  TRANSACTION_STATUS.OFFRAMPED,
  TRANSACTION_STATUS.ONRAMPED,
]);
// Put database schemas here
export const environmentsTable = pgTable(
  "environments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: environment().notNull(),
    businessID: uuid("business_id")
      .notNull()
      .references(() => businessesTable.id, { onDelete: "cascade" }),
    webhookUrl: text("webhook_url"),
    callbackUrl: text("callback_url"),
  },
  (t) => [unique().on(t.businessID, t.type)],
);
export const transactionsTable = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  environmentID: uuid("environment_id")
    .notNull()
    .references(() => environmentsTable.id, { onDelete: "cascade" }),
  reference: varchar("reference", { length: 100 }).notNull().unique(),
  token: token_type().notNull(),
  amount: integer("amount").notNull(), //  cents
  email: varchar("email", { length: 255 }).notNull(),
  transactionStatus: transaction_status()
    .notNull()
    .default(TRANSACTION_STATUS.PENDING),
  // from paystack
  authorizationUrl: varchar("authorization_url", { length: 500 }),
  accessCode: varchar("access_code", { length: 100 }),
  paystackResponseRaw: jsonb("paystack_response_raw"), // full paystack response for audit
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date()),
});
export const environmentKeysTable = pgTable(
  "environment_keys",
  {
    environmentID: uuid("environment_id")
      .references(() => environmentsTable.id, { onDelete: "cascade" })
      .notNull(),
    publicKey: text("public_key").notNull().unique(),
    privateKey: text("private_key").notNull().unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at"), // If set it means a new key has been created for environment
  },
  (table) => [
    primaryKey({
      columns: [table.environmentID, table.privateKey, table.publicKey],
    }),
  ],
);

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

export const treasuryBalanceTable = pgTable("treasury_token_balances", {
  token: token_type("token").notNull().primaryKey(),
  address: text("token_address").notNull(),
  chain: chain_enum("chain").notNull(),
  treasuryAccount: text("treasury_account").notNull(),
  decimals: integer("token_decimals").notNull(),
  balance: bigint("balance", {mode: "bigint"}).notNull()
})
