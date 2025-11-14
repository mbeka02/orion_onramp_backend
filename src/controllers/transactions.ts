import "dotenv/config";
import {
  InitializeTransactionRequest,
  InitializeTransactionResponse,
  VerifyTransactionResponse,
} from "../types/paystack";
import { TRANSACTION_STATUS } from "../types/transactions";
import axios, { AxiosError } from "axios";
import { TransactionModel } from "../models/transactions";
import { TOKEN_TYPE } from "../types/token";
import logger from "../lib/logger";
import { DatabaseError } from "pg";
import { DrizzleQueryError } from "drizzle-orm/errors";

export class TransactionController {
  private apiKey: string;
  private MAX_TRANSACTION_AMOUNT = 500000;
  private transactionModel: TransactionModel;
  private paystackBaseUrl = "https://api.paystack.co";
  constructor(tmodel: TransactionModel) {
    const PAYSTACK_TEST_SECRET = process.env.PAYSTACK_TEST_SECRET_KEY;
    const PAYSTACK_LIVE_SECRET = process.env.PAYSTACK_LIVE_SECRET_KEY;
    if (!PAYSTACK_TEST_SECRET || !PAYSTACK_LIVE_SECRET) {
      throw new Error(
        "Invalid env setup,ensure that the Paystack API keys have been configured",
      );
    }
    this.apiKey =
      process.env.NODE_ENV === "production"
        ? PAYSTACK_LIVE_SECRET
        : PAYSTACK_TEST_SECRET;
    this.transactionModel = tmodel;
  }
  async initializeTransaction(
    transactionRequest: InitializeTransactionRequest,
    environmentID: string,
    token: TOKEN_TYPE,
  ) {
    // Validate amount (assuming its in major units like KES, NGN , RAND)
    if (transactionRequest.amount > this.MAX_TRANSACTION_AMOUNT) {
      throw new Error(
        `Amount exceeds maximum transaction limit of ${this.MAX_TRANSACTION_AMOUNT}`,
      );
    }

    // Convert amount to minor units (cents)
    const amountMinor = Math.round(transactionRequest.amount * 100);

    // Generate unique reference BEFORE inserting to DB
    const reference = this.generateReference(environmentID, token);

    try {
      const transaction = await this.transactionModel.createTransaction({
        amount: amountMinor,
        email: transactionRequest.email,
        environmentID: environmentID,
        reference: reference,
        token: token,
        metadata: transactionRequest.metadata,
      });

      logger.info("Transaction record created", {
        reference,
        transactionId: transaction.id,
      });

      const paystackResponse = await this.callPaystackInitialize({
        ...transactionRequest,
        amount: amountMinor,
        reference: reference,
      });

      // Update transaction with Paystack response
      await this.transactionModel.updateTransactionWithPaystackResponse(
        reference,
        {
          authorizationUrl: paystackResponse.data.authorization_url,
          accessCode: paystackResponse.data.access_code,
          paystackResponseRaw: paystackResponse.data,
        },
      );

      logger.info("Transaction initialized successfully", { reference });

      return {
        reference: reference,
        authorization_url: paystackResponse.data.authorization_url,
        access_code: paystackResponse.data.access_code,
      };
    } catch (err) {
      // Handle duplicate reference (idempotency)
      if (err instanceof DrizzleQueryError) {
        if (err.cause instanceof DatabaseError) {
          if (err.cause.code === "23505") {
            // PostgreSQL unique violation
            logger.info("Duplicate transaction request detected", {
              reference,
            });

            const existingTransaction =
              await this.transactionModel.getTransactionByReference(reference);

            if (!existingTransaction) {
              throw new Error("Transaction exists but could not be retrieved");
            }

            // Return existing payment details
            return {
              reference: existingTransaction.reference,
              authorization_url: existingTransaction.authorizationUrl || "",
              access_code: existingTransaction.accessCode || "",
              message: "Payment already initialized",
            };
          }
        }
      }
      logger.error("Failed to initialize transaction", {
        error: err,
        reference,
      });
      throw err;
    }
  }

  /**
   * verifyTransaction() verifies transaction status
   */
  async verifyTransaction(reference: string) {
    try {
      // Check database first
      const transaction =
        await this.transactionModel.getTransactionByReference(reference);

      if (!transaction) {
        throw new Error(`Transaction not found: ${reference}`);
      }

      // If already processed (webhook likely handled it)
      if (transaction.transactionStatus !== TRANSACTION_STATUS.PENDING) {
        logger.info("Transaction already processed", {
          reference,
          status: transaction.transactionStatus,
        });

        return {
          reference: transaction.reference,
          status: transaction.transactionStatus,
          amount: transaction.amount,
          email: transaction.email,
        };
      }

      // If still pending, verify with Paystack API (fallback)
      logger.info("Transaction pending, verifying with Paystack", {
        reference,
      });

      const paystackVerification = await this.callPaystackVerify(reference);

      // Update transaction based on Paystack response
      const newStatus = this.mapPaystackStatusToInternal(
        paystackVerification.data.status,
      );

      await this.transactionModel.updateTransactionStatus(
        reference,
        newStatus,
        paystackVerification.data,
      );

      return {
        reference: transaction.reference,
        status: newStatus,
        amount: paystackVerification.data.amount,
        email: paystackVerification.data.customer.email,
      };
    } catch (error: any) {
      logger.error("Failed to verify transaction", {
        error: error.message,
        reference,
      });
      throw error;
    }
  }
  /**
   * Generate unique reference for transaction
   */
  private generateReference(environmentID: string, token: TOKEN_TYPE): string {
    //Use timestamp + random string for uniqueness
    const timestamp = Date.now();
    const randomPart = crypto.randomUUID().slice(0, 8);

    // Include token type in reference for easier tracking
    const tokenPrefix = token === TOKEN_TYPE.KESy_MAINNET ? "MAIN" : "TEST";

    return `TXN_${tokenPrefix}_${timestamp}_${randomPart}`;
  }

  /**
   * callPaystackInitialize() is a helper that calls the paystack initialize API
   */
  private async callPaystackInitialize(
    request: InitializeTransactionRequest & { reference: string },
  ): Promise<InitializeTransactionResponse> {
    try {
      const response = await axios.post<InitializeTransactionResponse>(
        `${this.paystackBaseUrl}/transaction/initialize`,
        {
          email: request.email,
          amount: request.amount,
          reference: request.reference,
          callback_url: request.callback_url,
          channels: request.channels,
          currency: request.currency || "KES",
          metadata: request.metadata,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.data.status) {
        throw new Error(`Paystack API error: ${response.data.message}`);
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<any>;
        logger.error("Paystack API error", {
          status: axiosError.response?.status,
          data: axiosError.response?.data,
        });
        throw new Error(
          `Paystack API error: ${axiosError.response?.data?.message || axiosError.message}`,
        );
      }
      throw error;
    }
  }

  /**
   callPaystackVerify() is a helper that calls the paystack verification API
   */
  private async callPaystackVerify(
    reference: string,
  ): Promise<VerifyTransactionResponse> {
    try {
      const response = await axios.get<VerifyTransactionResponse>(
        `${this.paystackBaseUrl}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      if (!response.data.status) {
        throw new Error(
          `Paystack verification failed: ${response.data.message}`,
        );
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<any>;
        logger.error("Paystack verify error", {
          status: axiosError.response?.status,
          data: axiosError.response?.data,
        });
        throw new Error(
          `Paystack verify error: ${axiosError.response?.data?.message || axiosError.message}`,
        );
      }
      throw error;
    }
  }

  /**
   mapPaystackStatusToInternal() is a helper that maps the paystack status to internal status
   */
  private mapPaystackStatusToInternal(
    paystackStatus: string,
  ): TRANSACTION_STATUS {
    switch (paystackStatus) {
      case "success":
        return TRANSACTION_STATUS.SUCCESSFUL;
      case "failed":
        return TRANSACTION_STATUS.FAILED;
      case "abandoned":
        return TRANSACTION_STATUS.FAILED;
      default:
        return TRANSACTION_STATUS.PENDING;
    }
  }
}
