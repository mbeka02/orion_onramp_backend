import { testAuth } from "../auth/test-auth";
import { db } from "../db";
import { user } from "../db/schema";
import { eq } from "drizzle-orm";
import logger from "../logger";

async function seedE2ETestUser() {
  // Don't want this running in prod
  if (process.env.NODE_ENV === "production") {
    logger.warn("Skipping seed - production environment detected");
    return;
  }

  await db.transaction(async (tx) => {
    await tx.delete(user).where(eq(user.email, "orion_test@example.com"));

    const testUser = await testAuth.api.signUpEmail({
      body: {
        email: "orion_test@example.com",
        password: "TestPassword123!",
        name: "Test User",
        businessName: "Test Business",
        phoneNumber: "+254712345678",
      } as any,
    });

    // Manually mark as verified
    if (testUser?.user?.id) {
      await tx
        .update(user)
        .set({
          emailVerified: true,
          updatedAt: new Date(),
        })
        .where(eq(user.id, testUser.user.id));
      logger.info(`Test user created and auto-verified: ${testUser.user.email}`);
    }
  });

  const testUser = await testAuth.api.signUpEmail({
    body: {
      email: "orion_test@example.com",
      password: "TestPassword123!",
      name: "Test User",
      businessName: "Test Business",
      phoneNumber: "+254712345678",
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
    logger.info(`Test user created and auto-verified: ${testUser.user.email}`);
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
