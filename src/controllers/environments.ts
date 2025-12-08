import logger from "../lib/logger";
import { EnvironmentModel } from "../models/environments";
import {
  CreateEnvironmentType,
  ENVIRONMENT_TYPES,
} from "../types/environments";
import { Errors, MyError } from "../errors";
import { EncryptionService } from "../lib/encryption";
import { BusinessModel } from "../models/businesses";
import webhookModel, { WebhookModel } from "../models/webhook";
import { WEBHOOK_CONTROLLER_EVENTS } from "../types/webhook";
import { TOKEN_TYPE } from "../types/token";

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
      const { public_key, private_key, webhook_secret } =
        environmentModel.createKeys();
      const encryptedPrivateKey = encryption_service.encrypt(private_key);
      const privateKeyHash = encryption_service.hash(private_key);
      const encryptedWebhookSecret = encryption_service.encrypt(webhook_secret);

      // Store environment
      const environment_id = await environmentModel.storeEnvironment({
        type: args.type,
        encrypted_private_key: encryptedPrivateKey,
        hashed_private_key: privateKeyHash,
        public_key,
        business_id: args.businessID,
        encrypted_webhook_secret: encryptedWebhookSecret,
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

  async getWebhookConfig(
    environment_id: string,
    user_id: string,
    environmentModel: EnvironmentModel,
    encryptionService: EncryptionService,
    businessModel: BusinessModel,
  ) {
    try {
      // Get environment and verify user has access
      const environment =
        await environmentModel.getEnvironmentById(environment_id);
      if (!environment) {
        throw new MyError(Errors.ENVIRONMENT_NOT_FOUND);
      }

      const isUserOwnerOrAdmin = await businessModel.isUserOwnerOrAdmin(
        environment.business_id,
        user_id,
      );
      if (!isUserOwnerOrAdmin) {
        throw new MyError(Errors.UNAUTHORIZED);
      }

      // Get webhook details
      const webhookDetails =
        await environmentModel.getEnvironmentWebhookDetails(
          environment_id,
          encryptionService,
        );
      if (!webhookDetails) {
        throw new MyError(Errors.ENVIRONMENT_NOT_FOUND);
      }

      return {
        webhookUrl: environment.webhook_url,
        webhookSecret: webhookDetails.webhook_secret,
      };
    } catch (err) {
      logger.error("Environment Controller: Error getting webhook config", {
        error: err,
        environment_id,
      });
      if (err instanceof MyError) {
        throw err;
      }
      throw new Error("Error getting webhook configuration");
    }
  }

  async updateWebhookUrl(
    environment_id: string,
    user_id: string,
    webhook_url: string,
    environmentModel: EnvironmentModel,
    businessModel: BusinessModel,
  ) {
    try {
      // Get environment and verify user has access
      const environment =
        await environmentModel.getEnvironmentById(environment_id);
      if (!environment) {
        throw new MyError(Errors.ENVIRONMENT_NOT_FOUND);
      }

      const isUserOwnerOrAdmin = await businessModel.isUserOwnerOrAdmin(
        environment.business_id,
        user_id,
      );
      if (!isUserOwnerOrAdmin) {
        throw new MyError(Errors.UNAUTHORIZED);
      }

      // Update webhook URL
      await environmentModel.updateWebhookUrl(environment_id, webhook_url);
    } catch (err) {
      logger.error("Environment Controller: Error updating webhook URL", {
        error: err,
        environment_id,
      });
      if (err instanceof MyError) {
        throw err;
      }
      throw new Error("Error updating webhook URL");
    }
  }

  async sendTestWebhook(
    environment_id: string,
    user_id: string,
    environmentModel: EnvironmentModel,
    encryptionService: EncryptionService,
    businessModel: BusinessModel,
  ) {
    try {
      // Get environment and verify user has access
      const environment =
        await environmentModel.getEnvironmentById(environment_id);
      if (!environment) {
        throw new MyError(Errors.ENVIRONMENT_NOT_FOUND);
      }

      const isUserOwnerOrAdmin = await businessModel.isUserOwnerOrAdmin(
        environment.business_id,
        user_id,
      );
      if (!isUserOwnerOrAdmin) {
        throw new MyError(Errors.UNAUTHORIZED);
      }

      // Check if webhook URL is set
      if (!environment.webhook_url) {
        throw new MyError(Errors.WEBHOOK_URL_NOT_SET);
      }

      // Get webhook secret
      const webhookDetails =
        await environmentModel.getEnvironmentWebhookDetails(
          environment_id,
          encryptionService,
        );
      if (!webhookDetails) {
        throw new MyError(Errors.ENVIRONMENT_NOT_FOUND);
      }

      // Create test webhook data
      const testData = {
        event_type: WEBHOOK_CONTROLLER_EVENTS.CHARGE_SUCCESS,
        order_id: "test_order_" + Date.now(),
        token: TOKEN_TYPE.KESy_TESTNET,
        amount: 100,
        currency: "KES",
      };

      // Generate signature
      const signature = webhookModel.generateSignature(
        testData,
        webhookDetails.webhook_secret,
      );

      // Send test webhook
      await webhookModel.sendEvent(
        testData,
        signature,
        environment.webhook_url,
      );
    } catch (err) {
      logger.error("Environment Controller: Error sending test webhook", {
        error: err,
        environment_id,
      });
      if (err instanceof MyError) {
        throw err;
      }
      throw new Error("Error sending test webhook");
    }
  }
}

const environmentController = new EnvironmentsController();
export default environmentController;
