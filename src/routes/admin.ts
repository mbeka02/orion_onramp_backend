import Express, { Router } from "express";
import logger from "../lib/logger";
import { Admincontroller } from "../controllers/admin";
import { AdminModel } from "../models/admin";
import { validateBody } from "../middleware/validation";
import {createAdminSchema, loginAdminSchema } from "../types/admin";
const router: Router = Express.Router();
const adminController = new Admincontroller();

router.post(
    "/create",
    validateBody(createAdminSchema),
    async (req, res) => {
        try {
            const adminModel = new AdminModel();
            const { admin, token } = await adminController.createadmin(req.body, adminModel);
            // Remove password from response
            const { password, ...adminWithoutPassword } = admin;
            res.status(201).json({
                success: true,
                message: "Admin created successfully",
                data: { admin: adminWithoutPassword, token },
            });
        } catch (err) {
            logger.error("Admin Route: Error creating admin", { err, body: req.body });
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
)
router.post(
    "/login",
    validateBody(loginAdminSchema),
    async (req, res) => {
        try {
            const adminModel = new AdminModel();
            const { admin, token } = await adminController.login(req.body, adminModel);
            // Remove password from response
            const { password, ...adminWithoutPassword } = admin;
            res.status(200).json({
                success: true,
                message: "Admin logged in successfully",
                data: { admin: adminWithoutPassword, token },
            });
        } catch (err) {
            logger.error("Admin Route: Error logging in admin", { err, body: req.body });
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
)

export default router;