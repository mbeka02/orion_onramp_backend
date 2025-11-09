import { betterAuth, type Auth } from "better-auth";
import { db } from "../db";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { account, session, user, verification } from "../db/schema";
import { emailService } from "../emails/email.util";
export const auth: Auth = betterAuth({
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
    requireEmailVerification: true,
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
        required: false, // optional for now
        defaultValue: "Kenya",
        input: false, // don't allow country selection for now.
      },
    },
  },
  trustedOrigins: [process.env.FRONTEND_URL!],
  emailVerification: {
    sendVerificationEmail: async ({ user, url }, request) => {
      await emailService.verificationEmail(url, user.email);
    },
    sendOnSignUp: true,
    sendOnSignIn: true,
    redirectTo: process.env.FRONTEND_URL!,
    autoSignInAfterVerification: true,
  }
});
