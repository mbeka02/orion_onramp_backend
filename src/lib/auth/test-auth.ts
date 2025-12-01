// src/lib/auth/test-auth.ts
import { betterAuth, type Auth } from "better-auth";
import { db } from "../db";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { account, session, user, verification } from "../db/schema";

const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3001";

export const testAuth: Auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      session,
      account,
      verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  user: {
    additionalFields: {
      businessName: {
        type: "string",
        required: true,
      },
      phoneNumber: {
        type: "string",
        required: true,
      },
      country: {
        type: "string",
        required: false,
        defaultValue: "Kenya",
        input: false,
      },
    },
  },
  trustedOrigins: [frontendUrl],
});
