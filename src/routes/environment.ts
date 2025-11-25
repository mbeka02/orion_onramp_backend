import Express, { Router } from "express";
import logger from "../lib/logger";
import {
  createEnvironmentSchema,
  rotateKeysSchema,
} from "../types/environments";
import environmentController from "../controllers/environments";
import environmentModel from "../models/environments";
import { authenticationMiddleware } from "../middleware/authenticationMiddleware";
import { SuccessMessage } from "../success";
import { Errors, MyError } from "../errors";
import { EncryptionService } from "../lib/encryption";
import { getAuthContext } from "../lib/auth/utils";
import businessModel from "../models/businesses";
const router: Router = Express.Router();

// GET all environments for a business
router.get("/:business", authenticationMiddleware, async (req, res) => {
  try {
    const session = await getAuthContext(req);
    if (!session?.user.id) {
      res.status(403).json({ message: Errors.UNAUTHORIZED });
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
        res.status(403).json({ message: err.message });
        return;
      }

      res.status(400).json({ message: err.message });
      return;
    }
    res.status(500).json({ message: Errors.INTERNAL_SERVER_ERROR });
  }
});

// Create new environment
router.post("/", authenticationMiddleware, async (req, res) => {
  try {
    const parsed = createEnvironmentSchema.safeParse(req.body);
    if (parsed.success) {
      const data = parsed.data;
      const session = await getAuthContext(req);

      if (!session?.user.id) {
        res.status(403).json({ message: Errors.UNAUTHORIZED });
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
        res.status(403).json({ message: err.message });
        return;
      }

      res.status(400).json({ message: err.message });
      return;
    }

    res.status(500).json({ message: Errors.INTERNAL_SERVER_ERROR });
  }
});

router.post("/new", authenticationMiddleware, async (req, res) => {
  try {
    const parsed = rotateKeysSchema.safeParse(req.body);
    if (parsed.success) {
      const data = parsed.data;
      const session = await getAuthContext(req);
      if (!session?.user.id) {
        res.status(403).json({ message: Errors.UNAUTHORIZED });
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
        res.status(403).json({ message: err.message });
        return;
      }

      res.status(400).json({ message: err.message });
      return;
    }
    res.status(500).json({ message: Errors.INTERNAL_SERVER_ERROR });
  }
});

export default router;
