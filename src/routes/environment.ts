import Express, { Router } from "express";
import logger from "../lib/logger";
import { createEnvironmentSchema } from "../types/environments";
import environmentController from "../controllers/environments";
import environmentModel from "../models/environments";
import { authenticationMiddleware } from "../middleware/authenticationMiddleware";
import { SuccessMessage } from "../success";
import { Errors } from "../errors";
import encryptionService from "../lib/encryption";
const router: Router = Express.Router();

router.post("/", authenticationMiddleware, async(req, res) => {
    try {
        const parsed = createEnvironmentSchema.safeParse(req.body);
        if (parsed.success) {
            const data = parsed.data;
            // TODO: Add code for getting business id from request
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
        res.status(500).json({message: Errors.INTERNAL_SERVER_ERROR})
    }
})

export default router;