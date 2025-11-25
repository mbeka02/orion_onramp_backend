import { Router, Request, Response } from "express";
import { TransactionController } from "../controllers/transactions";
import { TransactionModel } from "../models/transactions";
import { validateBody } from "../middleware/validation";
import { initializeTransactionSchema } from "../types/transactions";
import logger from "../lib/logger";
import { Errors, MyError } from "../errors";
import { PaystackWebhookPayload } from "../types/paystack";
import {
  authenticationMiddleware,
  validatePrivateKey,
} from "../middleware/authenticationMiddleware";
import treasuryController from "../controllers/treasury";
import treasuryModel from "../models/treasury";
import liquidityManagerController from "../controllers/liquidityManager";
import liquidityModel from "../models/liquidityManager";
import { emailService } from "../lib/emails/email.util";
import { ENVIRONMENT_TYPES } from "../types/environments";

const router: Router = Router();

const transactionModel = new TransactionModel();
const transactionController = new TransactionController(transactionModel);

/**
 * GET /api/transaction
 * Get all the transactions associated with an enviroment
 * Query Params:
 * business_id
 * environment_type
 * page
 * limit
 */
router.get("/", authenticationMiddleware, async (req, res) => {
  try {
    const businessID = req.query.business_id;
    const environmentType = req.query.environment_type;
    const rawPage = Number(req.query.page);
    const rawLimit = Number(req.query.limit);
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 20;
    if (
      !businessID ||
      !environmentType ||
      typeof businessID !== "string" ||
      typeof environmentType !== "string"
    ) {
      res.status(400).json({
        error:
          "Error Bad Request.Include the business id and environment type in the query parameters and ensure they are valid strings",
      });
      return;
    }
    const transactions = await transactionController.getTransactionsByBusiness(
      businessID,
      environmentType as ENVIRONMENT_TYPES,
      page,
      limit,
    );
    return res.status(200).json(transactions);
  } catch (err) {
    logger.error("Error fetching transactions in router", { error: err });

    if (err instanceof MyError) {
      return res.status(400).json({ message: err.message });
    }

    res.status(500).json({ message: Errors.INTERNAL_SERVER_ERROR });
  }
});
/**
 * GET /api/transaction/:id
 * Get the transaction details by id
 *  Params:
 * id
 *
 *
 */
router.get("/:id", authenticationMiddleware, async (req, res) => {
  try {
    const transactionID = req.params.id;
    const transaction =
      await transactionController.getTransactionByID(transactionID);
    res.status(200).json(transaction);
  } catch (err) {
    logger.error("Error fetching transaction in router", { error: err });

    if (err instanceof MyError) {
      return res.status(400).json({ message: err.message });
    }

    res.status(500).json({ message: Errors.INTERNAL_SERVER_ERROR });
  }
});

/**
 * POST /api/transaction/initialize
 * Initialize a new payment transaction
 *
 * Body:
 * - amount: number (in major units, e.g., KES 1000)
 * - email: string
 * - token: "KESy_MAINNET" | "KESy_TESTNET"
 * - metadata: { orderID: string, ...other fields }
 * - currency?: string (default: "KES")
 * - channels?: string[]
 * - callback_url?: string
 */
router.post(
  "/initialize",
  validatePrivateKey,
  validateBody(initializeTransactionSchema),
  async (req: Request, res: Response) => {
    try {
      if (!req.environment_id) {
        res.status(401).json({ error: Errors.UNAUTHORIZED });
        return;
      }

      const environmentID = req.environment_id;
      const { token, ...transactionRequest } = req.body;

      const result = await transactionController.initializeTransaction(
        transactionRequest,
        environmentID,
        token,
      );

      logger.info("Transaction initialized via API", {
        reference: result.reference,
        environmentID,
        token,
      });

      res.status(201).json(result);
    } catch (err) {
      logger.error("Error initializing transaction in router", { error: err });

      if (err instanceof MyError) {
        return res.status(400).json({ message: err.message });
      }

      res.status(500).json({ message: Errors.INTERNAL_SERVER_ERROR });
    }
  },
);
/**
 * Paystack webhook
 * Handles incoming webhook events from Paystack
 */
router.post("/webhook/paystack", async (req: Request, res: Response) => {
  try {
    const body = (req as any).rawBody;
    if (!body) {
      logger.error("Raw body not available for webhook signature validation");
      return res.status(400).send("Invalid request");
    }
    const paystackSignature = req.headers["x-paystack-signature"] as string;
    if (!paystackSignature) {
      logger.warn("Missing Paystack webhook signature");
      return res.status(400).send("Missing signature");
    }
    const isValid = transactionController.isSignatureValid(
      body,
      paystackSignature,
    );
    if (!isValid) {
      logger.warn("Invalid Paystack webhook signature");
      return res.status(400).send("Invalid signature");
    }
    const { event, data } = JSON.parse(body) as PaystackWebhookPayload;
    await transactionController.handlePaystackWebhook(event, data);
    res.status(200).send("Webhook received");

    try {
      // Call treasury
      await treasuryController.businessOnramp(
        data.reference,
        treasuryModel,
        liquidityManagerController,
        transactionModel,
        liquidityModel,
        emailService,
      );
    } catch (err) {
      // Will implement queuing of this in a later PR
      logger.error("Could not onramp tokens for business", {
        error: err,
        transaction: data.reference,
      });
    }
    return;
  } catch (error) {
    logger.error("Error handling Paystack webhook", { error });
    return res.status(500).send("Internal Server Error");
  }
});

export default router;
