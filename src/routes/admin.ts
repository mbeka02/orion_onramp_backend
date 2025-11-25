import Express, { Router } from "express";
import logger from "../lib/logger";
import { Admincontroller } from "../controllers/admin";
import { AdminModel } from "../models/admin";
import { validateBody } from "../middleware/validation";
import { createAdminSchema, loginAdminSchema } from "../types/admin";
import rateLimit from "express-rate-limit";
import { MyError } from "../errors";
const router: Router = Express.Router();
const adminController = new Admincontroller();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many login attempts, please try again later",
});
router.post(
  "/create",
  loginLimiter,
  validateBody(createAdminSchema),
  async (req, res) => {
    try {
      const adminModel = new AdminModel();
      const { admin, token } = await adminController.createadmin(
        req.body,
        adminModel,
      );
      res.status(201).json({
        success: true,
        message: "Admin created successfully",
        data: { admin, token },
      });
    } catch (err) {
      logger.error("Admin Route: Error creating admin", {
        err,
        body: {
          email: req.body.email,
          id: req.body.id,
        },
      });
      if (err instanceof MyError) {
        return res.status(400).json({ error: err.message });
      }
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);
router.post(
  "/login",
  loginLimiter,
  validateBody(loginAdminSchema),
  async (req, res) => {
    try {
      const adminModel = new AdminModel();
      const { admin, token } = await adminController.login(
        req.body,
        adminModel,
      );
      res.status(200).json({
        success: true,
        message: "Admin logged in successfully",
        data: { admin, token },
      });
    } catch (err) {
      logger.error("Admin Route: Error logging in admin", {
        err,
        body: {
          email: req.body.email,
          id: req.body.id,
        },
      });
      if (err instanceof MyError) {
        return res.status(400).json({ error: err.message });
      }
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

export default router;
