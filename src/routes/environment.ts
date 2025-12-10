import Express, { Router } from "express";
import logger from "../lib/logger";
import {
  createEnvironmentSchema,
  rotateKeysSchema,
  updateWebhookSchema,
} from "../types/environments";
import environmentController from "../controllers/environments";
import environmentModel from "../models/environments";
import { authenticationMiddleware } from "../middleware/authenticationMiddleware";
import { SuccessMessage } from "../success";
import { Errors, MyError } from "../errors";
import { EncryptionService } from "../lib/encryption";
import { getAuthContext } from "../lib/auth/utils";
import rateLimit from "express-rate-limit";
import businessModel from "../models/businesses";
import webhookModel from "../models/webhook";
const router: Router = Express.Router();
export const createEnvironmentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // Limit each IP to 30 requests per windowMs
  message:
    "Too many environments created from this IP, please try again after one hour",
});

export const rotateKeysLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // Limit each IP to 30 requests per windowMs
  message:
    "Too many key rotation attempts from this IP, please try again after one hour",
});

// GET all environments for a business
router.get("/:business", authenticationMiddleware, async (req, res) => {
  try {
    const session = await getAuthContext(req);
    if (!session?.user.id) {
      res.status(401).json({ message: Errors.UNAUTHORIZED });
      return;
    }

    const environments = await environmentController.getAllBusinessEnvironments(
      req.params.business,
      session.user.id,
      environmentModel,
      businessModel,
    );

    const formattedEnvironments = environments.map((env) => ({
      id: env.id,
      type: env.type,
      publicKey: env.public_key,
      privateKeyPreview: env.private_key_preview,
      createdAt: env.created_at,
    }));

    res.status(200).json({
      environments: formattedEnvironments,
    });
  } catch (err) {
    logger.error("Error getting environments in router", { error: err });
    if (err instanceof MyError) {
      if (err.message === Errors.UNAUTHORIZED) {
        res.status(401).json({ message: err.message });
        return;
      }

      res.status(400).json({ message: err.message });
      return;
    }
    res.status(500).json({ message: Errors.INTERNAL_SERVER_ERROR });
  }
});

// Create new environment
router.post(
  "/",
  authenticationMiddleware,
  createEnvironmentLimiter,
  async (req, res) => {
    try {
      const parsed = createEnvironmentSchema.safeParse(req.body);
      if (parsed.success) {
        const data = parsed.data;
        const session = await getAuthContext(req);

        if (!session?.user.id) {
          res.status(401).json({ message: Errors.UNAUTHORIZED });
          return;
        }

        const encryptionService = new EncryptionService();
        const result = await environmentController.create(
          data,
          session?.user.id,
          environmentModel,
          encryptionService,
          businessModel,
        );

        res.status(201).json({
          message: SuccessMessage.CREATE_ENVIRONMENT,
          environment: {
            id: result.environment_id,
            type: result.type,
            publicKey: result.public_key,
            privateKey: result.private_key,
          },
        });
      } else {
        const error = parsed.error.issues[0].message;
        logger.error("Environment Route: Invalid create data", {
          data: req.body,
          error,
        });
        res.status(400).json({ message: error });
        return;
      }
    } catch (err) {
      logger.error("Error creating environment in router", { error: err });
      if (err instanceof MyError) {
        if (err.message === Errors.UNAUTHORIZED) {
          res.status(401).json({ message: err.message });
          return;
        }

        res.status(400).json({ message: err.message });
        return;
      }

      res.status(500).json({ message: Errors.INTERNAL_SERVER_ERROR });
    }
  },
);

router.post(
  "/new",
  authenticationMiddleware,
  rotateKeysLimiter,
  async (req, res) => {
    try {
      const parsed = rotateKeysSchema.safeParse(req.body);
      if (parsed.success) {
        const data = parsed.data;
        const session = await getAuthContext(req);
        if (!session?.user.id) {
          res.status(401).json({ message: Errors.UNAUTHORIZED });
          return;
        }

        const userID = session.user.id;
        const encryptionService = new EncryptionService();
        const result = await environmentController.rotateKeys(
          data.businessID,
          userID,
          data.type,
          environmentModel,
          encryptionService,
          businessModel,
        );

        res.status(201).json({
          message: SuccessMessage.ROTATE_KEY,
          publicKey: result.public_key,
          privateKey: result.private_key,
        });
      } else {
        const error = parsed.error.issues[0].message;
        logger.error("Environment Route: Invalid rotate data", {
          data: req.body,
          error,
        });
        res.status(400).json({ message: error });
        return;
      }
    } catch (err) {
      logger.error("Error rotating key in router", { error: err });
      if (err instanceof MyError) {
        if (err.message === Errors.UNAUTHORIZED) {
          res.status(401).json({ message: err.message });
          return;
        }

        res.status(400).json({ message: err.message });
        return;
      }
      res.status(500).json({ message: Errors.INTERNAL_SERVER_ERROR });
    }
  },
);

// GET webhook configuration for an environment
router.get(
  "/:environmentId/webhook",
  authenticationMiddleware,
  async (req, res) => {
    try {
      const session = await getAuthContext(req);
      if (!session?.user.id) {
        res.status(401).json({ message: Errors.UNAUTHORIZED });
        return;
      }

      const encryptionService = new EncryptionService();
      const webhookConfig = await environmentController.getWebhookConfig(
        req.params.environmentId,
        session.user.id,
        environmentModel,
        encryptionService,
        businessModel,
      );

      res.status(200).json(webhookConfig);
    } catch (err) {
      logger.error("Error getting webhook config in router", { error: err });
      if (err instanceof MyError) {
        if (err.message === Errors.UNAUTHORIZED) {
          res.status(401).json({ message: err.message });
          return;
        }

        res.status(400).json({ message: err.message });
        return;
      }
      res.status(500).json({ message: Errors.INTERNAL_SERVER_ERROR });
    }
  },
);

// UPDATE webhook URL for an environment
router.put(
  "/:environmentId/webhook",
  authenticationMiddleware,
  async (req, res) => {
    try {
      const parsed = updateWebhookSchema.safeParse(req.body);
      if (!parsed.success) {
        const error = parsed.error.issues[0].message;
        logger.error("Environment Route: Invalid webhook update data", {
          data: req.body,
          error,
        });
        res.status(400).json({ message: error });
        return;
      }

      const session = await getAuthContext(req);
      if (!session?.user.id) {
        res.status(401).json({ message: Errors.UNAUTHORIZED });
        return;
      }

      await environmentController.updateWebhookUrl(
        req.params.environmentId,
        session.user.id,
        parsed.data.webhookUrl,
        environmentModel,
        businessModel,
      );

      res.status(200).json({
        message: SuccessMessage.UPDATE_WEBHOOK_URL,
      });
    } catch (err) {
      logger.error("Error updating webhook URL in router", { error: err });
      if (err instanceof MyError) {
        if (err.message === Errors.UNAUTHORIZED) {
          res.status(401).json({ message: err.message });
          return;
        }

        res.status(400).json({ message: err.message });
        return;
      }
      res.status(500).json({ message: Errors.INTERNAL_SERVER_ERROR });
    }
  },
);

// POST test webhook event
router.post(
  "/:environmentId/webhook/test",
  authenticationMiddleware,
  async (req, res) => {
    try {
      const session = await getAuthContext(req);
      if (!session?.user.id) {
        res.status(401).json({ message: Errors.UNAUTHORIZED });
        return;
      }

      const encryptionService = new EncryptionService();
      await environmentController.sendTestWebhook(
        req.params.environmentId,
        session.user.id,
        environmentModel,
        encryptionService,
        businessModel,
        webhookModel
      );

      res.status(200).json({
        message: SuccessMessage.TEST_WEBHOOK_SENT,
      });
    } catch (err) {
      logger.error("Error sending test webhook in router", { error: err });
      if (err instanceof MyError) {
        if (err.message === Errors.UNAUTHORIZED) {
          res.status(401).json({ message: err.message });
          return;
        }

        res.status(400).json({ message: err.message });
        return;
      }
      res.status(500).json({ message: Errors.INTERNAL_SERVER_ERROR });
    }
  },
);

export default router;
