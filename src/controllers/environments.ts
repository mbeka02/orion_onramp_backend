import logger from "../lib/logger";
import { EnvironmentModel } from "../models/environments";
import { CreateEnvironmentType, ENVIRONMENT_TYPES } from "../types/environments";
import { Errors, MyError } from "../errors";
import { EncryptionService } from "../lib/encryption";

export class EnvironmentsController {
    async create(args: CreateEnvironmentType, business_id: string, environmentModel: EnvironmentModel, encryption_service: EncryptionService) {
        try {
            const doesBusinessAlreadyHaveEnvironment = await environmentModel.doesBusinessAlreadyHaveEnvironment(business_id, args.type);
            if (doesBusinessAlreadyHaveEnvironment === true) {
                throw new MyError(Errors.BUSINESS_ALREADY_HAS_ENVIRONMENT);
            }

            // Create keys for environment
            const {public_key, private_key} = environmentModel.createKeys();
            const encryptedPrivateKey = encryption_service.encrypt(private_key);

            // Store environment
            const environment_id = await environmentModel.storeEnvironment({
                type: args.type,
                private_key: encryptedPrivateKey,
                public_key,
                business_id
            });
            return environment_id;
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
        } catch(err) {
            if (err instanceof MyError) {
                throw err;
            }

            logger.error("Environment Controller: Error rotating keys", {err, business_id, environment_type});
            throw new Error("Error rotating keys");
        }
    }
}

const environmentController = new EnvironmentsController();
export default environmentController;