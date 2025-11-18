import { Router, Request, Response } from "express";
import { TransactionController } from "../controllers/transactions";
import { TransactionModel } from "../models/transactions";
import { validateBody } from "../middleware/validation";
import { initializeTransactionSchema } from "../types/transactions";
import logger from "../lib/logger";
import { Errors, MyError } from "../errors";
import { PaystackWebhookPayload } from "../types/paystack";
const router: Router = Router();

const transactionModel = new TransactionModel();
const transactionController = new TransactionController(transactionModel);

/**
 * POST /api/transaction/initialize
 * Initialize a new payment transaction
 *
 * Body:
 * - amount: number (in major units, e.g., KES 1000)
 * - email: string
 * - environmentID: string (UUID)
 * - token: "KESy_MAINNET" | "KESy_TESTNET"
 * - metadata: { orderID: string, ...other fields }
 * - currency?: string (default: "KES")
 * - channels?: string[]
 * - callback_url?: string
 */
router.post(
  "/initialize",
  validateBody(initializeTransactionSchema),
  async (req: Request, res: Response) => {
    try {
      const { environmentID, token, ...transactionRequest } = req.body;

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

      res.status(201).json({
        success: true,
        message: "Transaction initialized successfully",
        data: result,
      });
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
router.post("/paystack", async (req: Request, res: Response) => {
  try {
    const body = (req as any).rawBody;
    if (!body) {
      logger.error("Raw body not available for webhook signature validation");
      return res.status(400).send("Invalid request");
    }
    const paystackSignature = req.headers['x-paystack-signature'] as string;
    const isValid = transactionController.isSignatureValid(body, paystackSignature);
    if (!isValid) {
      logger.warn("Invalid Paystack webhook signature");
      return res.status(400).send("Invalid signature");
    }
    const { event, data } = JSON.parse(body) as PaystackWebhookPayload;
    await transactionController.handlePaystackWebhook(event, data);
    return res.status(200).send("Webhook received");
  } catch (error) {
    logger.error("Error handling Paystack webhook", { error });
    return res.status(500).send("Internal Server Error");
  }
});

export default router;
