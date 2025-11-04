import { text } from "drizzle-orm/pg-core";
import { pgTable, pgEnum } from "drizzle-orm/pg-core";
import { ENVIRONMENT_TYPES } from "../../types/environments";

export const environment = pgEnum("environment_types", [ENVIRONMENT_TYPES.LIVE, ENVIRONMENT_TYPES.TEST])

// Put database schemas here
export const environments = pgTable("environments", {
    publicKey: text("public_key").notNull().unique(),
    privateKey: text("private_key").notNull().unique(),
    type: environment().notNull(),
    webhookUrl: text("webhook_url"),
    callbackUrl: text("callback_url")
})