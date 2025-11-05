import Express, { Router } from "express";
import logger from "../lib/logger";
import { createEnvironmentSchema } from "../types/environments";
const router: Router = Express.Router();

router.post("/", async(req, res) => {
    try {
        const parsed = createEnvironmentSchema.safeParse(req.body);
        if (parsed.success) {
            const data = parsed.data;
        } else {
            const error = parsed.error.issues[0].message;
            logger.error("Environment Route: Invalid create data", {data: req.body, error});
            res.status(400).json({message: error});
            return;
        }
    } catch(err) {
        logger.error("Error creating environment in router", {error: err});
        res.status(500).json({message: err})
    }
})

export default router;