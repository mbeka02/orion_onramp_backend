import { and, eq, sql } from "drizzle-orm";
import { db } from "../lib/db";
import logger from "../lib/logger";
import { transactionsTable } from "../lib/db/schema";
import { TRANSACTION_STATUS } from "../types/transactions";

export class TreasuryModel {
    async doesTransactionExist(transaction_id: string): Promise<boolean> {
        try {
           const transactionRes = await db.select({
                id: transactionsTable.id
            }).from(transactionsTable)
            .where(eq(transactionsTable.id, transaction_id));

            return transactionRes.length > 0;
        } catch(err) {
            logger.error("Error checking if transaction exists", {error: err, transaction_id});
            throw new Error("Could not check if transaction id exists");
        }
    }

    // Assumes that a transaction with the given ID already exists
    async hasTransactionAlreadyBeenOnramped(transaction_id: string): Promise<boolean> {
        try {
            const onrampTransactionsRes = await db.select({
                id: transactionsTable.id
            }).from(transactionsTable)
            .where(and(
                eq(transactionsTable.id, transaction_id),
                eq(transactionsTable.transactionStatus, TRANSACTION_STATUS.ONRAMPED)
            ));

            return onrampTransactionsRes.length > 0;
        } catch(err) {
            logger.error("Could not check if transaction has already been onramped in database", {error: err, transaction_id});
            throw new Error("Could not check if transaction has already been onramped");
        }
    }
}

const treasuryModel = new TreasuryModel();
export default treasuryModel;