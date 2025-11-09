import { betterAuth, type Auth } from "better-auth";
import { db } from "../db";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { account, session, user, verification } from "../db/schema";
import { emailService } from "../emails/email.util";
const frontendUrl = process.env.FRONTEND_URL;
if (!frontendUrl) {
  throw new Error('FRONTEND_URL environment variable is required');
}
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
    sendResetPassword: async ({ user, url }, request) => {
      try {
        await emailService.resetPasswordEmail(url, user.email);
      }
      catch (error) {
        throw Error("Unable to send password reset email. Please try again later.");
      }
    }
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
  trustedOrigins: [frontendUrl],
  emailVerification: {
    sendVerificationEmail: async ({ user, url }, request) => {
      try {
        await emailService.verificationEmail(url, user.email);
      }
      catch (error) {
        throw Error("Unable to send password verification email. Please try again later.");
      }
    },
    sendOnSignUp: true,
    redirectTo: frontendUrl,
    autoSignInAfterVerification: true,
  }
});
