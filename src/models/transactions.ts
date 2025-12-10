import { environmentsTable, transactionsTable } from "../lib/db/schema";
import { db } from "../lib/db";
import logger from "../lib/logger";
import { TOKEN_TYPE } from "../types/token";
import { TRANSACTION_STATUS } from "../types/transactions";
import { DatabaseError } from "pg";
import {
  desc,
  count,
  eq,
  or,
  like,
  DrizzleQueryError,
  and,
  getTableColumns,
} from "drizzle-orm";
import { ENVIRONMENT_TYPES } from "../types/environments";
import {
  webhookControllerMetaDataParser,
  webhookControllerPaystackResponseParser,
} from "../types/webhook";
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

interface WebhookControllerTransactionDetails {
  transaction_reference: string;
  business_webhook: string | null;
  transaction_status: string;
  order_id: string;
  token: TOKEN_TYPE;
  amountInCents: number;
  currency: string | null;
  environmentID: string;
}

export class TransactionModel {
  /**
   * Get transactions for a business with pagination
   */
  async getTransactionsByBusiness(
    businessID: string,
    environmentType: ENVIRONMENT_TYPES,
    page: number = 1,
    limit: number = 20,
    filters?: {
      status?: TRANSACTION_STATUS;
      token?: TOKEN_TYPE;
      search?: string;
    },
  ) {
    const offset = (page - 1) * limit;

    try {
      // Build where conditions dynamically
      const conditions = [
        eq(environmentsTable.type, environmentType),
        eq(environmentsTable.businessID, businessID),
      ];
      if (filters?.status) {
        conditions.push(
          eq(transactionsTable.transactionStatus, filters.status),
        );
      }

      if (filters?.token) {
        conditions.push(eq(transactionsTable.token, filters.token));
      }
      if (filters?.search) {
        const searchConditions = [
          like(transactionsTable.reference, `%${filters.search}%`),
          like(transactionsTable.email, `%${filters.search}%`),
        ];

        const searchCondition = or(...searchConditions);
        if (searchCondition) {
          conditions.push(searchCondition);
        }
      }
      const whereClause = and(...conditions);
      const [transactionData, totalCountResult] = await Promise.all([
        db
          .select({
            ...getTableColumns(transactionsTable),
          })
          .from(transactionsTable)
          .innerJoin(
            environmentsTable,
            eq(environmentsTable.id, transactionsTable.environmentID),
          )
          .where(whereClause)
          .limit(limit)
          .offset(offset)
          .orderBy(desc(transactionsTable.createdAt)),
        db
          .select({ count: count() })
          .from(transactionsTable)
          .innerJoin(
            environmentsTable,
            eq(environmentsTable.id, transactionsTable.environmentID),
          )
          .where(whereClause),
      ]);

      const totalItems = totalCountResult[0]?.count || 0;
      const totalPages = Math.ceil(totalItems / limit);

      const formattedTransactions = transactionData.map(
        ({ paystackResponseRaw, ...tx }) => ({
          ...tx,
          amountInCents: tx.amount,
          amountMajor: tx.amount / 100,
        }),
      );

      return {
        data: formattedTransactions,
        pagination: {
          currentPage: page,
          itemsPerPage: limit,
          totalItems,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    } catch (err) {
      logger.error("Error fetching business transactions", {
        error: err,
        businessID,
        environmentType,
      });
      throw new Error("Error fetching transactions", { cause: err });
    }
  }
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
      if (err instanceof DrizzleQueryError) {
        if (err.cause instanceof DatabaseError) {
          if (err.cause.code === "23505") {
            logger.warn("Duplicate transaction reference", {
              reference: args.reference,
            });
            throw err;
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
  /**
   * Helper: Get the Business ID associated with a Transaction ID
   * This is used for permission checks.
   */
  async getTransactionBusinessId(
    transactionId: string,
  ): Promise<string | null> {
    try {
      const [result] = await db
        .select({ businessId: environmentsTable.businessID })
        .from(transactionsTable)
        .innerJoin(
          environmentsTable,
          eq(transactionsTable.environmentID, environmentsTable.id),
        )
        .where(eq(transactionsTable.id, transactionId))
        .limit(1);

      return result?.businessId || null;
    } catch (err) {
      logger.error("Error fetching business ID for transaction", {
        error: err,
        transactionId,
      });
      throw new Error("Error fetching transaction context", { cause: err });
    }
  }

  async getWebhookControllerTransactionDetails(
    transaction_reference: string,
  ): Promise<WebhookControllerTransactionDetails | null> {
    try {
      const results = await db
        .select({
          transaction_reference: transactionsTable.reference,
          business_webhook: environmentsTable.webhookUrl,
          environmentID: transactionsTable.environmentID,
          transaction_status: transactionsTable.transactionStatus,
          metadata: transactionsTable.metadata,
          token: transactionsTable.token,
          amountInCents: transactionsTable.amount,
          paystackResponse: transactionsTable.paystackResponseRaw,
        })
        .from(transactionsTable)
        .innerJoin(
          environmentsTable,
          eq(environmentsTable.id, transactionsTable.environmentID),
        )
        .where(eq(transactionsTable.reference, transaction_reference))
        .limit(1);

      if (results.length < 1) {
        return null;
      }

      const rawTx = results[0];
      const orderIDParsed = webhookControllerMetaDataParser.safeParse(
        rawTx.metadata,
      );
      if (!orderIDParsed.success) {
        return null;
      }
      const orderID = orderIDParsed.data.orderID;

      const paystackResponseParsed =
        webhookControllerPaystackResponseParser.safeParse(
          rawTx.paystackResponse,
        );
      let currency = null;
      if (paystackResponseParsed.success) {
        currency = paystackResponseParsed.data.currency;
      }

      return {
        transaction_reference: rawTx.transaction_reference,
        business_webhook: rawTx.business_webhook,
        environmentID: rawTx.environmentID,
        transaction_status: rawTx.transaction_status,
        order_id: orderID,
        token: rawTx.token,
        amountInCents: rawTx.amountInCents,
        currency: currency,
      };
    } catch (err) {
      logger.error(
        "Transaction Model: Could not get webhook controller transaction details from db",
        { error: err, transaction_reference },
      );
      throw new Error("Error fetching webhook controller transaction details");
    }
  }
}
export const transactionModel = new TransactionModel();
