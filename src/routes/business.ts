import Express, { Router } from "express";
import logger from "../lib/logger";
import { authenticationMiddleware } from "../middleware/authenticationMiddleware";
import businessController from "../controllers/businesses";
import businessModel from "../models/businesses";
import { createBusinessSchema, updateBusinessSchema, submitBusinessForApprovalSchema, inviteUserSchema } from "../types/businesses";
import { getAuthContext } from "../lib/auth/utils";
import { Errors, MyError } from "../errors";

const router: Router = Express.Router();

// Get all businesses for authenticated user
router.get("/", authenticationMiddleware, async (req, res) => {
    try {
        const session = await getAuthContext(req as any);
        const userId = session?.user?.id;
        if (!userId) return res.status(401).json({ message: Errors.UNAUTHORIZED });

        const businesses = await businessController.getAllUserBusinesses(userId, businessModel);
        res.status(200).json({ businesses });
    } catch (err) {
        logger.error("Error getting businesses in router", { error: err });
        res.status(500).json({ message: Errors.INTERNAL_SERVER_ERROR });
    }
});

// Create draft business
router.post("/", authenticationMiddleware, async (req, res) => {
    try {
        const parsed = createBusinessSchema.safeParse(req.body);
        if (!parsed.success) {
            const error = parsed.error.issues[0].message;
            logger.error("Business Route: Invalid create data", { data: req.body, error });
            res.status(400).json({ message: error });
            return;
        }

        const session = await getAuthContext(req as any);
        const userId = session?.user?.id;
        if (!userId) return res.status(401).json({ message: Errors.UNAUTHORIZED });

        const result = await businessController.createDraft(parsed.data, userId, businessModel);
        res.status(201).json({ message: "Business draft created", business: { id: result.business_id } });
    } catch (err) {
        logger.error("Error creating business in router", { error: err });
        if (err instanceof MyError) return res.status(400).json({ message: err.message });
        res.status(500).json({ message: Errors.INTERNAL_SERVER_ERROR });
    }
});

// Update business draft
router.put("/:id", authenticationMiddleware, async (req, res) => {
    try {
        const parsed = createBusinessSchema.safeParse(req.body);
        if (!parsed.success) {
            const error = parsed.error.issues[0].message;
            logger.error("Business Route: Invalid update data", { data: req.body, error });
            res.status(400).json({ message: error });
            return;
        }

        const session = await getAuthContext(req as any);
        const userId = session?.user?.id;
        if (!userId) return res.status(401).json({ message: Errors.UNAUTHORIZED });

        const businessId = req.params.id;
        await businessController.updateBusiness(businessId, parsed.data, userId, businessModel);
        res.status(200).json({ message: "Business updated" });
    } catch (err) {
        logger.error("Error updating business in router", { error: err });
        if (err instanceof MyError) return res.status(400).json({ message: err.message });
        res.status(500).json({ message: Errors.INTERNAL_SERVER_ERROR });
    }
});

// Submit business for approval (save and change status to pending)
router.post("/submit/:id", authenticationMiddleware, async (req, res) => {
    try {
        const parsed = submitBusinessForApprovalSchema.safeParse(req.body);
        if (!parsed.success) {
            const error = parsed.error.issues[0].message;
            logger.error("Business Route: Invalid submit data", { data: req.body, error });
            res.status(400).json({ message: error });
            return;
        }

        const session = await getAuthContext(req as any);
        const userId = session?.user?.id;
        if (!userId) return res.status(401).json({ message: Errors.UNAUTHORIZED });

        const businessId = req.params.id;
        // Save updates first
        await businessController.updateBusiness(businessId, parsed.data, userId, businessModel);
        // Then submit for approval
        await businessController.submitForApproval(businessId, userId, businessModel);

        res.status(200).json({ message: "Business submitted for approval" });
    } catch (err) {
        logger.error("Error submitting business in router", { error: err });
        if (err instanceof MyError) return res.status(400).json({ message: err.message });
        res.status(500).json({ message: Errors.INTERNAL_SERVER_ERROR });
    }
});

// Invite user to business
router.post("/:id/invite", authenticationMiddleware, async (req, res) => {
    try {
        const parsed = inviteUserSchema.safeParse(req.body);
        if (!parsed.success) {
            const error = parsed.error.issues[0].message;
            logger.error("Business Route: Invalid invite data", { data: req.body, error });
            res.status(400).json({ message: error });
            return;
        }

        const session = await getAuthContext(req as any);
        const userId = session?.user?.id;
        if (!userId) return res.status(401).json({ message: Errors.UNAUTHORIZED });

        const businessId = req.params.id;
        const result = await businessController.inviteUser(businessId, userId, parsed.data, businessModel);
        res.status(201).json({ message: "Invitation created", invite: result });
    } catch (err) {
        logger.error("Error inviting user in router", { error: err });
        if (err instanceof MyError) return res.status(400).json({ message: err.message });
        res.status(500).json({ message: Errors.INTERNAL_SERVER_ERROR });
    }
});

// Accept an invitation
router.post("/invitations/:inviteId/accept", authenticationMiddleware, async (req, res) => {
    try {
        const session = await getAuthContext(req as any);
        const userId = session?.user?.id;
        const userEmail = session?.user?.email;
        if (!userId || !userEmail) return res.status(401).json({ message: Errors.UNAUTHORIZED });

        const inviteId = req.params.inviteId;
        await businessController.acceptInvitation(inviteId, userId, userEmail, businessModel);
        res.status(200).json({ message: "Invitation accepted" });
    } catch (err) {
        logger.error("Error accepting invitation in router", { error: err });
        res.status(500).json({ message: Errors.INTERNAL_SERVER_ERROR });
    }
});

// Delete business
router.delete("/:id", authenticationMiddleware, async (req, res) => {
    try {
        const session = await getAuthContext(req as any);
        const userId = session?.user?.id;
        if (!userId) return res.status(401).json({ message: Errors.UNAUTHORIZED });

        const businessId = req.params.id;
        await businessController.deleteBusiness(businessId, userId, businessModel);
        res.status(200).json({ message: "Business deleted" });
    } catch (err) {
        logger.error("Error deleting business in router", { error: err });
        if (err instanceof MyError) return res.status(400).json({ message: err.message });
        res.status(500).json({ message: Errors.INTERNAL_SERVER_ERROR });
    }
});

// Get business by id
router.get("/:id", authenticationMiddleware, async (req, res) => {
    try {
        const businessId = req.params.id;
        const business = await businessController.getBusinessById(businessId, businessModel);
        res.status(200).json({ business });
    } catch (err) {
        logger.error("Error getting business in router", { error: err });
        if (err instanceof MyError) return res.status(404).json({ message: err.message });
        res.status(500).json({ message: Errors.INTERNAL_SERVER_ERROR });
    }
});

export default router;
