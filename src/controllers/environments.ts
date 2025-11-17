import logger from "../lib/logger";
import { EnvironmentModel } from "../models/environments";
import { CreateEnvironmentType, ENVIRONMENT_TYPES } from "../types/environments";
import { Errors, MyError } from "../errors";
import { EncryptionService } from "../lib/encryption";
import { BusinessModel } from "../models/businesses";

export class EnvironmentsController {
    async create(args: CreateEnvironmentType, user_id: string, environmentModel: EnvironmentModel, encryption_service: EncryptionService, businessModel: BusinessModel) {
        try {
            const doesBusinessAlreadyHaveEnvironment = await environmentModel.doesBusinessAlreadyHaveEnvironment(args.businessID, args.type);
            if (doesBusinessAlreadyHaveEnvironment === true) {
                throw new MyError(Errors.BUSINESS_ALREADY_HAS_ENVIRONMENT);
            }

            const isUserOwnerOrAdmin = await businessModel.isUserOwnerOrAdmin(args.businessID, user_id);
            if (isUserOwnerOrAdmin === false) {
                throw new MyError(Errors.UNAUTHORIZED);
            }

            // Create keys for environment
            const {public_key, private_key} = environmentModel.createKeys();
            const encryptedPrivateKey = encryption_service.encrypt(private_key);

            // Store environment
            const environment_id = await environmentModel.storeEnvironment({
                type: args.type,
                private_key: encryptedPrivateKey,
                public_key,
                business_id: args.businessID
            });

            // Return the keys for immediate display
            return {
                environment_id,
                type: args.type,
                public_key,
                private_key, // Return unencrypted private key (shown only once)
            };
        } catch(err) {
            if (err instanceof MyError) {
                throw err;
            }

            logger.error("Environment Controller: Error creating controller", {error: err, args});
            throw new Error("Could not create environment");
        }
    }

    async rotateKeys(business_id: string, environment_type: ENVIRONMENT_TYPES, environmentModel: EnvironmentModel, encryption_service: EncryptionService) {
        try {
            // Should check if business has the environment
            const businessHasEnvironment = await environmentModel.doesBusinessAlreadyHaveEnvironment(business_id, environment_type);

            // If not throw error
            if (businessHasEnvironment === false) {
                throw new MyError(Errors.BUSINESS_DOES_NOT_HAVE_ENVIRONMENT);
            }

            // Get old key
            const oldKeys = await environmentModel.getLatestValidBusinessEnvironmentKeys(business_id, environment_type);
            if (!oldKeys) {
                throw new MyError(Errors.BUSINESS_DOES_NOT_HAVE_KEYS);
            }

            // If so generate a new key
            const {public_key, private_key} = environmentModel.createKeys();
            const encryptedPrivateKey = encryption_service.encrypt(private_key);

            // Store new key
            await environmentModel.rotateKey(
                business_id,
                environment_type,
                public_key,
                encryptedPrivateKey,
                oldKeys.public_key
            );

            // Return the new keys for immediate display
            return {
                public_key,
                private_key, // Return unencrypted private key (shown only once)
            };
        } catch(err) {
            if (err instanceof MyError) {
                throw err;
            }

            logger.error("Environment Controller: Error rotating keys", {err, business_id, environment_type});
            throw new Error("Error rotating keys");
        }
    }

    async getAllBusinessEnvironments(business_id: string, environmentModel: EnvironmentModel) {
        try {
            const environments = await environmentModel.getBusinessEnvironments(business_id);
            return environments;
        } catch(err) {
            logger.error("Environment Controller: Error getting environments", {err, business_id});
            throw new Error("Error getting environments");
        }
    }
}

const environmentController = new EnvironmentsController();
export default environmentController;