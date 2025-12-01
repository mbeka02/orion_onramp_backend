import { testAuth } from "../auth/test-auth";
import { db } from "../db";
import { user } from "../db/schema";
import { eq } from "drizzle-orm";
import logger from "../logger";

async function seedE2ETestUser() {
  // Only want this running in development
  if (process.env.NODE_ENV === "development") {
    const testEmail = process.env.E2E_TEST_USER_EMAIL || "orion_test@example.com";
    const testPassword = process.env.E2E_TEST_USER_PASSWORD || "TestPassword123!";
    const testPhone = process.env.E2E_TEST_USER_PHONE || "+254712345678";

    await db.delete(user).where(eq(user.email, testEmail));
    const testUser = await testAuth.api.signUpEmail({
      body: {
        email: testEmail,
        password: testPassword,
        name: "Test User",
        businessName: "Test Business",
        phoneNumber: testPhone,
      } as any,
    });
    // Manually mark as verified
    if (testUser?.user?.id) {
      await db
        .update(user)
        .set({
          emailVerified: true,
          updatedAt: new Date(),
        })
        .where(eq(user.id, testUser.user.id));
      logger.info(
        `Test user created and auto-verified: ${testUser.user.email}`,
      );
    }
  } else {
    logger.warn("Skipping seed - production environment detected");
    return;
  }
}

export async function initializeE2ETestAccount() {
  try {
    await seedE2ETestUser();
  } catch (err) {
    logger.fatal(`Error seeding test account for E2E tests: ${err}`);
    process.exit(1);
  }
}
