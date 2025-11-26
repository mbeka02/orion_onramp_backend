import Express, { Router } from "express";
import logger from "../lib/logger";
import { Admincontroller } from "../controllers/admin";
import { AdminModel } from "../models/admin";
import { validateBody } from "../middleware/validation";
import { createAdminSchema, loginAdminSchema, ROLE } from "../types/admin";
import rateLimit from "express-rate-limit";
import { MyError } from "../errors";
import { adminAuthenticationMiddleware } from "../middleware/adminAuthenticationMiddleware";
import { BUSINESS_STATUS } from "../types/businesses";
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
  adminAuthenticationMiddleware,
  async (req, res) => {
    try {
      if (req.role !== ROLE.SUPER_ADMIN) {
        return res
          .status(403)
          .json({ error: "Forbidden: Only SUPER_ADMIN can create new admins" });
      }
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

// Business Management Routes (Protected)

/**
 * GET /api/admin/businesses
 * Get paginated list of businesses filtered by status
 * Query params:
 * - status?: "Draft" | "Pending" | "Approved" | "Rejected" | "Suspended"
 * - page?: number (default: 1)
 * - limit?: number (default: 10, max: 100)
 */
router.get("/businesses", adminAuthenticationMiddleware, async (req, res) => {
  try {
    const { status, page = "1", limit = "10" } = req.query;

    // Parse and validate query parameters
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({ error: "Invalid page parameter" });
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({ error: "Invalid limit parameter (1-100)" });
    }

    // Validate status parameter if provided
    let businessStatus: BUSINESS_STATUS | undefined;
    if (status) {
      const validStatuses = Object.values(BUSINESS_STATUS);
      if (!validStatuses.includes(status as BUSINESS_STATUS)) {
        return res.status(400).json({
          error: "Invalid status parameter",
          validStatuses,
        });
      }
      businessStatus = status as BUSINESS_STATUS;
    }

    const adminModel = new AdminModel();
    const result = await adminController.getBusinessesByStatus(
      businessStatus,
      pageNum,
      limitNum,
      adminModel,
    );

    res.status(200).json({
      success: true,
      message: "Businesses retrieved successfully",
      data: result,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount: result.totalCount,
        totalPages: result.totalPages,
      },
    });
  } catch (err) {
    logger.error("Admin Route: Error getting businesses", {
      err,
      adminId: req.adminId,
      query: req.query,
    });
    if (err instanceof MyError) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * GET /api/admin/businesses/:id
 * Get a specific business by ID
 */
router.get(
  "/businesses/:id",
  adminAuthenticationMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: "Business ID is required" });
      }

      const adminModel = new AdminModel();
      const business = await adminController.getBusinessById(id, adminModel);

      res.status(200).json({
        success: true,
        message: "Business retrieved successfully",
        data: { business },
      });
    } catch (err) {
      logger.error("Admin Route: Error getting business by ID", {
        err,
        businessId: req.params.id,
        adminId: req.adminId,
      });
      if (err instanceof MyError) {
        return res.status(400).json({ error: err.message });
      }
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

/**
 * PUT /api/admin/businesses/:id/approve
 * Approve a pending business
 */
router.put(
  "/businesses/:id/approve",
  adminAuthenticationMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;
      const adminId = req.adminId!;

      if (!id) {
        return res.status(400).json({ error: "Business ID is required" });
      }

      const adminModel = new AdminModel();
      const result = await adminController.approveBusiness(
        id,
        adminId,
        adminModel,
      );

      res.status(200).json({
        success: true,
        message: result.message,
        data: null,
      });
    } catch (err) {
      logger.error("Admin Route: Error approving business", {
        err,
        businessId: req.params.id,
        adminId: req.adminId,
      });
      if (err instanceof MyError) {
        return res.status(400).json({ error: err.message });
      }
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

/**
 * PUT /api/admin/businesses/:id/suspend
 * Suspend an active or pending business
 */
router.put(
  "/businesses/:id/suspend",
  adminAuthenticationMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;
      const adminId = req.adminId!;

      if (!id) {
        return res.status(400).json({ error: "Business ID is required" });
      }

      const adminModel = new AdminModel();
      const result = await adminController.suspendBusiness(
        id,
        adminId,
        adminModel,
      );

      res.status(200).json({
        success: true,
        message: result.message,
        data: null,
      });
    } catch (err) {
      logger.error("Admin Route: Error suspending business", {
        err,
        businessId: req.params.id,
        adminId: req.adminId,
      });
      if (err instanceof MyError) {
        return res.status(400).json({ error: err.message });
      }
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
);

export default router;
