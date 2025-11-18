import logger from "../lib/logger";
import { ENVIRONMENT_TYPES } from "../types/environments";
import { db } from "../lib/db";
import { environmentKeysTable, environmentsTable } from "../lib/db/schema";
import { eq, and, desc, isNull, gt, or } from "drizzle-orm";
import { generateKeyPairSync } from "crypto";

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
            let environment_id: string | null = null;
            await db.transaction(async (tx) => {
                const createdEnvironment = await tx.insert(environmentsTable).values({
                    businessID: environment.business_id,
                    type: environment.type
                }).returning({ id: environmentsTable.id });

                if (createdEnvironment.length < 1) {
                    throw new Error("Environment was not created");
                }
                environment_id = createdEnvironment[0].id

                await tx.insert(environmentKeysTable).values({
                    environmentID: environment_id,
                    publicKey: environment.public_key,
                    encryptedPrivateKey: environment.private_key
                });
            })

            if (environment_id) {
                return environment_id;
            } else {
                throw new Error("Environment was not created")
            }
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

    async getLatestValidBusinessEnvironmentKeys(business_id: string, environment_type: ENVIRONMENT_TYPES): Promise<{public_key: string, encrypted_private_key: string} | null> {
        try {
            const environmentKeys = await db.select({
                encrypted_private_key: environmentKeysTable.encryptedPrivateKey,
                public_key: environmentKeysTable.publicKey
            }).from(environmentKeysTable)
            .innerJoin(environmentsTable, eq(environmentsTable.id, environmentKeysTable.environmentID))
            .where(and(
                eq(environmentsTable.businessID, business_id),
                eq(environmentsTable.type, environment_type),    
                isNull(environmentKeysTable.expiresAt)
            ))
            .orderBy(desc(environmentKeysTable.createdAt))
            .limit(1);

            if (environmentKeys.length < 1) {
                return null;
            } else {
                return environmentKeys[0];
            }
        } catch(err) {
            logger.error("Error getting business environment keys", {error: err, business_id, environment_type});
            throw new Error("Error getting environment keys");
        }
    }

    async getBusinessEnvironments(business_id: string): Promise<Array<{
        id: string,
        type: ENVIRONMENT_TYPES,
        public_key: string,
        private_key_preview: string,
        created_at: Date
    }>> {
        try {
            const environments = await db.select({
                id: environmentsTable.id,
                type: environmentsTable.type,
                public_key: environmentKeysTable.publicKey,
                encrypted_private_key: environmentKeysTable.encryptedPrivateKey,
                created_at: environmentKeysTable.createdAt
            }).from(environmentsTable)
            .innerJoin(environmentKeysTable, eq(environmentsTable.id, environmentKeysTable.environmentID))
            .where(and(
                eq(environmentsTable.businessID, business_id),
                isNull(environmentKeysTable.expiresAt)
            ))
            .orderBy(desc(environmentKeysTable.createdAt));

            // Mask private keys for security (show only last 6 characters)
            return environments.map(env => ({
                id: env.id,
                type: env.type,
                public_key: env.public_key,
                private_key_preview: '***' + env.encrypted_private_key.slice(-6),
                created_at: env.created_at
            }));
        } catch(err) {
            logger.error("Error getting business environments", {error: err, business_id});
            throw new Error("Error getting business environments");
        }
    }

    // Assumes that business with environment exists
    async rotateKey(business_id: string, environment_type: ENVIRONMENT_TYPES, new_public_key: string, new_private_key: string, old_public_key: string) {
        try {
            
            await db.transaction(async (tx) => {
                const environmentID = await tx.select({
                    id: environmentsTable.id
                }).from(environmentsTable)
                .where(and(
                    eq(environmentsTable.businessID, business_id),
                    eq(environmentsTable.type, environment_type)
                ));

                if (environmentID.length < 1) {
                    throw new Error("Could not get ID of environment");
                }

                // Store new key
                await tx.insert(environmentKeysTable).values({
                    environmentID: environmentID[0].id,
                    publicKey: new_public_key,
                    encryptedPrivateKey: new_private_key
                });

                const expiresAt = new Date();
                expiresAt.setMinutes(expiresAt.getMinutes() + 5, 0, 0);
                // Add an expiresAt for old key (1 minute from current time)
                await tx.update(environmentKeysTable).set({
                    expiresAt: expiresAt
                }).where(and(
                    eq(environmentKeysTable.environmentID, environmentID[0].id),
                    eq(environmentKeysTable.publicKey, old_public_key)
                ));
            })
            
           
        } catch(err) {
            logger.error("Error storing new keys", {error: err});
            throw new Error("Could not store new keys");
        }
    }

    async doesPrivateKeyExist(private_key: string): Promise<string | null> {
        try {
            const now = new Date();
            const exists = await db.select({
                environment: environmentKeysTable.environmentID
            }).from(environmentKeysTable)
            .where(and(
                eq(environmentKeysTable.encryptedPrivateKey, private_key),
                or(isNull(environmentKeysTable.expiresAt), gt(environmentKeysTable.expiresAt, now))
            ))
            .limit(1);

            if (exists.length > 0) {
                return exists[0].environment;
            }

            return null;
        } catch(err) {
            logger.error("Environment Model: Error checking if private key exists", {error: err});
            throw new Error("Error checking if private key exists");
        }
    }
}

const environmentModel = new EnvironmentModel();
export default environmentModel;