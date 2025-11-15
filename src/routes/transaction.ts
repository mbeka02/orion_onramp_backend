import { Router, Request, Response } from "express";
import { TransactionController } from "../controllers/transactions";
import { TransactionModel } from "../models/transactions";
import { validateBody, validateParams } from "../middleware/validation";
import {
  initializeTransactionSchema,
  verifyTransactionParamsSchema,
} from "../types/transactions";
import logger from "../lib/logger";
import { Errors, MyError } from "../errors";
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
 * GET /api/transaction/verify/:reference
 * Verify the status of a transaction
 *
 * Params:
 * - reference: string (transaction reference, e.g., TXN_TEST_ORDER123)
 */
router.get(
  "/verify/:reference",
  validateParams(verifyTransactionParamsSchema),
  async (req: Request, res: Response) => {
    try {
      const { reference } = req.params;

      const result = await transactionController.verifyTransaction(reference);

      logger.info("Transaction verified via API", {
        reference,
        status: result.status,
      });

      res.status(200).json({
        success: true,
        message: "Transaction verified successfully",
        data: result,
      });
    } catch (err) {
      logger.error("Error verifying transaction in router", {
        error: err,
        reference: req.params.reference,
      });

      if (err instanceof MyError) {
        return res.status(400).json({ message: err.message });
      }

      res.status(500).json({ message: Errors.INTERNAL_SERVER_ERROR });
    }
  },
);
