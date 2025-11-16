import { transactionsTable } from "../lib/db/schema";
import { db } from "../lib/db";
import logger from "../lib/logger";
import { TOKEN_TYPE } from "../types/token";
import { DrizzleError, eq } from "drizzle-orm";
import { TRANSACTION_STATUS } from "../types/transactions";
import { DatabaseError } from "pg";
interface createTransactionArgs {
  amount: number;
  email: string;
  environmentID: string;
  reference: string;
  token: TOKEN_TYPE;
  authorizationUrl?: string;
  accessCode?: string;
  metadata?: Record<string, any>;
}

interface UpdatePaystackResponseArgs {
  authorizationUrl: string;
  accessCode: string;
  paystackResponseRaw: Record<string, any>;
}
export class TransactionModel {
  async createTransaction(args: createTransactionArgs) {
    try {
      const [insertedTransaction] = await db
        .insert(transactionsTable)
        .values({
          amount: args.amount,
          email: args.email,
          environmentID: args.environmentID,
          token: args.token,
          reference: args.reference,
          authorizationUrl: args.authorizationUrl,
          accessCode: args.accessCode,
          metadata: args.metadata,
        })
        .returning();
      logger.info("Transaction created", {
        id: insertedTransaction.id,
        reference: insertedTransaction.reference,
      });
      return insertedTransaction;
    } catch (err) {
      // Re-throw with code for idempotency handling
      if (err instanceof DrizzleError) {
        if (err.cause instanceof DatabaseError) {
          if (err.cause.code === "23505") {
            logger.warn("Duplicate transaction reference", {
              reference: args.reference,
            });
            throw err; // Let controller handle this
          }
        }
      }
      logger.error(
        "Transaction Model Error: Error creating transaction record",
        { error: err },
      );
      throw new Error("Error creating transaction record", { cause: err });
    }
  }

  /**
   * Update transaction with Paystack response data
   */
  async updateTransactionWithPaystackResponse(
    reference: string,
    data: UpdatePaystackResponseArgs,
  ) {
    try {
      const [updated] = await db
        .update(transactionsTable)
        .set({
          authorizationUrl: data.authorizationUrl,
          accessCode: data.accessCode,
          paystackResponseRaw: data.paystackResponseRaw,
          updatedAt: new Date(),
        })
        .where(eq(transactionsTable.reference, reference))
        .returning();

      if (!updated) {
        throw new Error(`Transaction not found: ${reference}`);
      }

      logger.info("Transaction updated with Paystack response", { reference });

      return updated;
    } catch (err: any) {
      logger.error("Error updating transaction with Paystack response", {
        error: err.message,
        reference,
      });
      throw new Error("Error updating transaction", { cause: err });
    }
  }

  /**
   * Update transaction status (from webhook or verification)
   */
  async updateTransactionStatus(
    reference: string,
    status: TRANSACTION_STATUS,
    paystackData?: Record<string, any>,
  ) {
    try {
      const [updated] = await db
        .update(transactionsTable)
        .set({ transactionStatus: status, paystackResponseRaw: paystackData })
        .where(eq(transactionsTable.reference, reference))
        .returning();

      if (!updated) {
        throw new Error(`Transaction not found: ${reference}`);
      }

      logger.info("Transaction status updated", { reference, status });

      return updated;
    } catch (err) {
      logger.error("Error updating transaction status", {
        error: err,
        reference,
        status,
      });
      throw new Error("Error updating transaction status", { cause: err });
    }
  }

  /**
   * Get transaction by reference
   */
  async getTransactionByReference(reference: string) {
    try {
      const [transaction] = await db
        .select()
        .from(transactionsTable)
        .where(eq(transactionsTable.reference, reference))
        .limit(1);

      return transaction || null;
    } catch (err) {
      logger.error("Error fetching transaction", {
        error: err,
        reference,
      });
      throw new Error("Error fetching transaction", { cause: err });
    }
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(id: string) {
    try {
      const [transaction] = await db
        .select()
        .from(transactionsTable)
        .where(eq(transactionsTable.id, id))
        .limit(1);
      return transaction || null;
    } catch (err) {
      logger.error("Error fetching transaction by ID", {
        error: err,
        id,
      });
      throw new Error("Error fetching transaction", { cause: err });
    }
  }
}
export const transactionModel = new TransactionModel();
