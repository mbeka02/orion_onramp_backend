import Express, { Router } from "express";
import logger from "../lib/logger";
import { createEnvironmentSchema, rotateKeysSchema } from "../types/environments";
import environmentController from "../controllers/environments";
import environmentModel from "../models/environments";
import { authenticationMiddleware } from "../middleware/authenticationMiddleware";
import { SuccessMessage } from "../success";
import { Errors, MyError } from "../errors";
import { EncryptionService } from "../lib/encryption";
const router: Router = Express.Router();

router.post("/", authenticationMiddleware, async(req, res) => {
    try {
        const parsed = createEnvironmentSchema.safeParse(req.body);
        if (parsed.success) {
            const data = parsed.data;
            // TODO: Add code for getting business id from request
            const encryptionService = new EncryptionService();
            await environmentController.create(data, "355b6a4f-b4e8-41bc-8673-578afb8e11d6", environmentModel, encryptionService);
            res.status(201).json({message: SuccessMessage.CREATE_ENVIRONMENT})
        } else {
            const error = parsed.error.issues[0].message;
            logger.error("Environment Route: Invalid create data", {data: req.body, error});
            res.status(400).json({message: error});
            return;
        }
    } catch(err) {
        logger.error("Error creating environment in router", {error: err});
        if (err instanceof MyError) {
            res.status(400).json({message: err.message});
            return;
        }

        res.status(500).json({message: Errors.INTERNAL_SERVER_ERROR})
    }
});

router.post("/new", async (req, res) => {
    try {
        const parsed = rotateKeysSchema.safeParse(req.body);
        if (parsed.success) {
            const data = parsed.data;

            // TODO: Add code for getting business id from request
            const encryptionService = new EncryptionService();
            await environmentController.rotateKeys("355b6a4f-b4e8-41bc-8673-578afb8e11d6", data.type, environmentModel, encryptionService);
            res.status(201).json({message: SuccessMessage.ROTATE_KEY});
        } else {
            const error = parsed.error.issues[0].message;
            logger.error("Environment Route: Invalid rotate data", {data: req.body, error});
            res.status(400).json({message: error});
            return;
        }
    } catch(err) {
        logger.error("Error rotating key in router", {error: err});
        if (err instanceof MyError) {
            res.status(400).json({message: err.message});
            return;
        }
        res.status(500).json({message: Errors.INTERNAL_SERVER_ERROR});
    }
})

export default router;