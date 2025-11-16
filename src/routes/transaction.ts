import { Router, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { TransactionController } from "../controllers/transactions";
import { TransactionModel } from "../models/transactions";
import { validateBody, validateParams } from "../middleware/validation";
import {
  initializeTransactionSchema,
  verifyTransactionParamsSchema,
} from "../types/transactions";
import logger from "../lib/logger";
import { Errors, MyError } from "../errors";
import { defaults } from "axios";
const router: Router = Router();

// Rate limiter for transaction verification endpoints
const verifyTransactionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 requests per minute
  message: {
    message:
      "Too many verification requests from this IP, please try again later.",
  },
});

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

export default router;
