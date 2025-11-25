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
import { MyError, Errors } from "../errors";
import * as crypto from "crypto";
import {
  WebhookEvent,
  WebhookChargeData,
  WEBHOOK_EVENTS,
} from "../types/paystack";
import { ENVIRONMENT_TYPES } from "../types/environments";
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
        "Invalid env setup, ensure that the Paystack API keys have been configured",
      );
    }

    this.apiKey =
      process.env.NODE_ENV === "production"
        ? PAYSTACK_LIVE_SECRET
        : PAYSTACK_TEST_SECRET;

    this.transactionModel = tmodel;
  }

  /**
   * Initialize a new payment transaction
   */
  async initializeTransaction(
    transactionRequest: InitializeTransactionRequest,
    environmentID: string,
    token: TOKEN_TYPE,
  ) {
    // Validate amount (in major units like KES, NGN, RAND)
    if (transactionRequest.amount > this.MAX_TRANSACTION_AMOUNT) {
      throw new MyError(Errors.TRANSACTION_AMOUNT_EXCEEDS_LIMIT);
    }

    // Get the orderID from metadata
    const orderID = transactionRequest.metadata?.orderID;
    if (!orderID || typeof orderID !== "string") {
      throw new MyError(Errors.TRANSACTION_MISSING_ORDER_ID);
    }

    // Convert amount to minor units (cents)
    const amountMinor = Math.round(transactionRequest.amount * 100);

    // Generate unique reference BEFORE inserting to DB
    const reference = this.generateReference(orderID, environmentID, token);

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
              throw new MyError(Errors.TRANSACTION_CREATION_FAILED);
            }

            // Return existing payment details
            return {
              reference: existingTransaction.reference,
              authorization_url: existingTransaction.authorizationUrl || "",
              access_code: existingTransaction.accessCode || "",
              message: Errors.TRANSACTION_ALREADY_INITIALIZED,
            };
          }
        }
      }

      logger.error("Failed to initialize transaction", {
        error: err,
        reference,
      });

      if (err instanceof MyError) {
        throw err;
      }

      // Wrap other errors
      throw new MyError(Errors.TRANSACTION_CREATION_FAILED, { cause: err });
    }
  }

  /**
   * Verify transaction status
   */
  async verifyTransaction(reference: string) {
    try {
      const transaction =
        await this.transactionModel.getTransactionByReference(reference);

      if (!transaction) {
        throw new MyError(`${Errors.TRANSACTION_NOT_FOUND}: ${reference}`);
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

      logger.debug("Transaction pending, verifying with Paystack", {
        reference,
      });

      const paystackVerification = await this.callPaystackVerify(reference);

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
    } catch (err) {
      logger.error("Failed to verify transaction", {
        error: err,
        reference,
      });

      if (err instanceof MyError) {
        throw err;
      }

      // Wrap other errors
      throw new MyError(Errors.PAYSTACK_VERIFICATION_FAILED, { cause: err });
    }
  }
  /**
   * Get transactions for a business with pagination
   */
  async getTransactionsByBusiness(
    businessID: string,
    environmentType: ENVIRONMENT_TYPES,
    page: number,
    limit: number,
  ) {
    try {
      const transactions =
        await this.transactionModel.getTransactionsByBusiness(
          businessID,
          environmentType,
          page,
          limit,
        );
      return transactions;
    } catch (err) {
      logger.error("Failed to fetch transactions for business", {
        error: err,
        businessID,
        environmentType,
        page,
        limit,
      });

      if (err instanceof MyError) {
        throw err;
      }

      // Wrap other errors
      throw new MyError(Errors.TRANSACTIONS_FETCH_FAILED, { cause: err });
    }
  }
  /**
   * Get transaction by ID
   */
  async getTransactionByID(transactionID: string) {
    try {
      const transaction =
        await this.transactionModel.getTransactionById(transactionID);
      if (!transaction) {
        throw new MyError(Errors.TRANSACTION_NOT_FOUND);
      }
      return transaction;
    } catch (err) {
      logger.error("Failed to fetch transaction by ID", {
        error: err,
        transactionID,
      });
      if (err instanceof MyError) {
        throw err;
      }
      // Wrap other errors
      throw new MyError(Errors.TRANSACTION_FETCH_FAILED, { cause: err });
    }
  }
  /**
   * Generate unique reference for the DApp transaction
   */
  private generateReference(
    orderID: string,
    environmentID: string,
    token: TOKEN_TYPE,
  ): string {
    const tokenPrefix = token === TOKEN_TYPE.KESy_MAINNET ? "MAIN" : "TEST";
    return `TXN_${tokenPrefix}_${environmentID}_${orderID}`;
  }

  /**
   * Call Paystack initialize API
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
        throw new MyError(
          `${Errors.PAYSTACK_API_ERROR}: ${response.data.message}`,
        );
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<any>;
        logger.error("Paystack API error", {
          status: axiosError.response?.status,
          data: axiosError.response?.data,
        });

        const message =
          axiosError.response?.data?.message || axiosError.message;
        throw new MyError(`${Errors.PAYSTACK_API_ERROR}: ${message}`, {
          cause: error,
        });
      }

      if (error instanceof MyError) {
        throw error;
      }

      throw new MyError(Errors.PAYSTACK_API_ERROR, { cause: error });
    }
  }

  /**
   * Call Paystack verify API
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
        throw new MyError(
          `${Errors.PAYSTACK_VERIFICATION_FAILED}: ${response.data.message}`,
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

        const message =
          axiosError.response?.data?.message || axiosError.message;
        throw new MyError(
          `${Errors.PAYSTACK_VERIFICATION_FAILED}: ${message}`,
          {
            cause: error,
          },
        );
      }
      if (error instanceof MyError) {
        throw error;
      }

      throw new MyError(Errors.PAYSTACK_VERIFICATION_FAILED, { cause: error });
    }
  }

  /**
   * Map Paystack status to internal status
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
  isSignatureValid(body: string, paystackSignature: string): boolean {
    try {
      const secret = this.apiKey;
      const hash = crypto
        .createHmac("sha512", secret)
        .update(body, "utf8")
        .digest("hex");
      const hashBuffer = Buffer.from(hash, "hex");
      const sigBuffer = Buffer.from(paystackSignature, "hex");
      if (hashBuffer.length !== sigBuffer.length) return false;
      return crypto.timingSafeEqual(hashBuffer, sigBuffer);
    } catch (error) {
      logger.error("Error validating Paystack signature", { error: error });
      return false;
    }
  }
  async handlePaystackWebhook(event: WebhookEvent, data: WebhookChargeData) {
    try {
      switch (event) {
        case WEBHOOK_EVENTS.CHARGE_SUCCESS:
          await this.processChargeSuccess(data);
          break;
        case WEBHOOK_EVENTS.CHARGE_FAILED:
          await this.processChargeFailed(data);
          break;
        default:
          logger.info("Unhandled Paystack webhook event", { event });
          return;
      }
    } catch (err) {
      logger.error("Error handling Paystack webhook", { err });
      if (err instanceof MyError) {
        throw err;
      }
      throw new MyError("unexpected error when handling paystack webhook", {
        cause: err,
      });
    }
  }
  async processChargeSuccess(data: WebhookChargeData) {
    try {
      const reference = data.reference;
      if (!data?.reference) {
        logger.error("Missing reference in charge.success webhook data", {
          data,
        });
        throw new MyError(Errors.MISSING_REFERENCE);
      }
      const transaction =
        await this.transactionModel.getTransactionByReference(reference);
      if (!transaction) {
        logger.warn("Transaction not found for charge.success webhook", {
          reference,
        });
        throw new MyError(Errors.TRANSACTION_NOT_FOUND);
      }
      if (transaction.transactionStatus === TRANSACTION_STATUS.SUCCESSFUL) {
        logger.info("Transaction already marked successful", { reference });
        return;
      }
      await this.transactionModel.updateTransactionStatus(
        reference,
        TRANSACTION_STATUS.SUCCESSFUL,
        data,
      );
      logger.info("Transaction marked successful via webhook", { reference });
      //TODO: Treasury logic goes here
    } catch (error) {
      logger.error("Error processing charge success webhook", { error });
      if (error instanceof MyError) {
        throw error;
      }

      throw new MyError("Error processing charge success webhook", {
        cause: error,
      });
    }
  }
  async processChargeFailed(data: WebhookChargeData) {
    try {
      const reference = data.reference;
      if (!data?.reference) {
        logger.error("Missing reference in charge.failed webhook data", {
          data,
        });
        throw new MyError(Errors.MISSING_REFERENCE);
      }
      const transaction =
        await this.transactionModel.getTransactionByReference(reference);
      if (!transaction) {
        logger.warn("Transaction not found for charge.failed webhook", {
          reference,
        });
        throw new MyError(Errors.TRANSACTION_NOT_FOUND);
      }
      if (transaction.transactionStatus === TRANSACTION_STATUS.FAILED) {
        logger.info("Transaction already marked failed", { reference });
        return;
      }
      await this.transactionModel.updateTransactionStatus(
        reference,
        TRANSACTION_STATUS.FAILED,
        data,
      );
      logger.info("Transaction marked failed via webhook", { reference });
      //TODO: Treasury logic goes here
    } catch (error) {
      logger.error("Error processing charge failed webhook", { error });
      if (error instanceof MyError) {
        throw error;
      }
      throw new MyError("Error processing charge failed webhook", {
        cause: error,
      });
    }
  }
}
