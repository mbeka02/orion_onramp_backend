import logger from "../lib/logger";
import { ENVIRONMENT_TYPES } from "../types/environments";
import { db } from "../lib/db";
import { environmentsTable } from "../lib/db/schema";
import { eq, and } from "drizzle-orm";
import { generateKeyPairSync, createHash } from "crypto";

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

            return existingBusinessQuery.length > 0;
        } catch (err) {
            logger.error("Environment Model Error: Error checking if business already has environment", { error: err, businessID, environmentType });
            throw new Error("Error checking if business already has environment");
        }
    }

    async storeEnvironment(environment: { type: ENVIRONMENT_TYPES, public_key: string, private_key: string, business_id: string }): Promise<string> {
        try {
            const createdEnvironment = await db.insert(environmentsTable).values({
                businessID: environment.business_id,
                privateKey: environment.private_key,
                publicKey: environment.public_key,
                type: environment.type
            }).returning({ id: environmentsTable.id });

            return createdEnvironment[0].id;
        } catch (err) {
            logger.error("Environment Model Error: Error storing environment", { error: err, environment })
            throw new Error("Error storing created environment in db");
        }
    }

    createKeys(): { public_key: string, private_key: string } {
        try {
            const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
                publicKeyEncoding: { format: "pem", type: 'spki' },
                privateKeyEncoding: { format: "pem", type: "pkcs8" }
            });

            function extractBase64FromPEM(pem: string) {
                return pem
                    .replace(/-----BEGIN [^-]+-----/, '')    // Remove header
                    .replace(/-----END [^-]+-----/, '')      // Remove footer
                    .replace(/\s+/g, '');
            }
            
            const extractedPublicKey = extractBase64FromPEM(publicKey);
            const extractedPrivateKey = extractBase64FromPEM(privateKey);

            return {
                public_key: extractedPublicKey,
                private_key: extractedPrivateKey
            }
        } catch (err) {
            logger.error("Environment Model Error: Error creating API keys", { error: err });
            throw new Error("Error creating API keys");
        }
    }
}

const environmentModel = new EnvironmentModel();
export default environmentModel;