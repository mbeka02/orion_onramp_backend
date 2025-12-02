import logger from "../lib/logger";
import { EnvironmentModel } from "../models/environments";
import {
  CreateEnvironmentType,
  ENVIRONMENT_TYPES,
} from "../types/environments";
import { Errors, MyError } from "../errors";
import { EncryptionService } from "../lib/encryption";
import { BusinessModel } from "../models/businesses";

export class EnvironmentsController {
  async create(
    args: CreateEnvironmentType,
    user_id: string,
    environmentModel: EnvironmentModel,
    encryption_service: EncryptionService,
    businessModel: BusinessModel,
  ) {
    try {
      const isUserOwnerOrAdmin = await businessModel.isUserOwnerOrAdmin(
        args.businessID,
        user_id,
      );
      if (isUserOwnerOrAdmin === false) {
        throw new MyError(Errors.UNAUTHORIZED);
      }

      if (args.type === ENVIRONMENT_TYPES.LIVE) {
        const isBusinessApproved = await businessModel.isBusinessApproved(
          args.businessID,
        );
        if (isBusinessApproved === false) {
          throw new MyError(Errors.BUSINESS_NOT_APPROVED);
        }
      }

      const doesBusinessAlreadyHaveEnvironment =
        await environmentModel.doesBusinessAlreadyHaveEnvironment(
          args.businessID,
          args.type,
        );
      if (doesBusinessAlreadyHaveEnvironment === true) {
        throw new MyError(Errors.BUSINESS_ALREADY_HAS_ENVIRONMENT);
      }

      // Create keys for environment
      const { public_key, private_key, webhook_secret } = environmentModel.createKeys();
      const encryptedPrivateKey = encryption_service.encrypt(private_key);
      const privateKeyHash = encryption_service.hash(private_key);
      const encryptedWebhookSecret = encryption_service.encrypt(webhook_secret)

      // Store environment
      const environment_id = await environmentModel.storeEnvironment({
        type: args.type,
        encrypted_private_key: encryptedPrivateKey,
        hashed_private_key: privateKeyHash,
        public_key,
        business_id: args.businessID,
        encrypted_webhook_secret: encryptedWebhookSecret
      });

      // Return the keys for immediate display
      return {
        environment_id,
        type: args.type,
        public_key,
        private_key, // Return unencrypted private key (shown only once)
      };
    } catch (err) {
      if (err instanceof MyError) {
        throw err;
      }

      logger.error("Environment Controller: Error creating controller", {
        error: err,
        args,
      });
      throw new Error("Could not create environment");
    }
  }

  async rotateKeys(
    business_id: string,
    user_id: string,
    environment_type: ENVIRONMENT_TYPES,
    environmentModel: EnvironmentModel,
    encryption_service: EncryptionService,
    businessModel: BusinessModel,
  ) {
    try {
      const isAdminUserOrOwner = await businessModel.isUserOwnerOrAdmin(
        business_id,
        user_id,
      );
      if (isAdminUserOrOwner === false) {
        throw new MyError(Errors.UNAUTHORIZED);
      }

      // Should check if business has the environment
      const businessHasEnvironment =
        await environmentModel.doesBusinessAlreadyHaveEnvironment(
          business_id,
          environment_type,
        );

      // If not throw error
      if (businessHasEnvironment === false) {
        throw new MyError(Errors.BUSINESS_DOES_NOT_HAVE_ENVIRONMENT);
      }

      // Get old key
      const oldKeys =
        await environmentModel.getLatestValidBusinessEnvironmentKeys(
          business_id,
          environment_type,
        );
      if (!oldKeys) {
        throw new MyError(Errors.BUSINESS_DOES_NOT_HAVE_KEYS);
      }

      // If so generate a new key
      const { public_key, private_key } = environmentModel.createKeys();
      const encryptedPrivateKey = encryption_service.encrypt(private_key);
      const hashedPrivateKey = encryption_service.hash(private_key);

      // Store new key
      await environmentModel.rotateKey(
        business_id,
        environment_type,
        public_key,
        encryptedPrivateKey,
        oldKeys.public_key,
        hashedPrivateKey,
      );

      // Return the new keys for immediate display
      return {
        public_key,
        private_key, // Return unencrypted private key (shown only once)
      };
    } catch (err) {
      if (err instanceof MyError) {
        throw err;
      }

      logger.error("Environment Controller: Error rotating keys", {
        err,
        business_id,
        environment_type,
      });
      throw new Error("Error rotating keys");
    }
  }

  async getAllBusinessEnvironments(
    business_id: string,
    user_id: string,
    environmentModel: EnvironmentModel,
    businessModel: BusinessModel,
  ) {
    try {
      const isUserOwnerOrAdmin = await businessModel.isUserOwnerOrAdmin(
        business_id,
        user_id,
      );
      if (isUserOwnerOrAdmin === false) {
        throw new MyError(Errors.UNAUTHORIZED);
      }
      const environments =
        await environmentModel.getBusinessEnvironments(business_id);
      return environments;
    } catch (err) {
      logger.error("Environment Controller: Error getting environments", {
        err,
        business_id,
      });
      if (err instanceof MyError) {
        throw err;
      }
      throw new Error("Error getting environments");
    }
  }
}

const environmentController = new EnvironmentsController();
export default environmentController;
