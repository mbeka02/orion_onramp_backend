import logger from "../lib/logger";
import { ENVIRONMENT_TYPES } from "../types/environments";
import { db } from "../lib/db";
import { environmentsTable } from "../lib/db/schema";
import { eq, and } from "drizzle-orm";

export class EnvironmentModel {
    async doesBusinessAlreadyHaveEnvironment(businessID: string, environmentType: ENVIRONMENT_TYPES): Promise<boolean> {
        try {
            const existingBusinessQuery = await db.select({
                id: environmentsTable.id
            }).from(environmentsTable)
            .where(and(
                eq(environmentsTable.businessID, businessID),
                eq(environmentsTable.type, environmentType)
            ));

            return existingBusinessQuery.length > 1;
        } catch(err) {
            logger.error("Environment Model Error: Error checking if business already has environment", {error: err, businessID, environmentType});
            throw new Error("Error checking if business already has environment");
        }
    }
}