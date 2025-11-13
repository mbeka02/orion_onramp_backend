import { sql } from "drizzle-orm";
import { db } from "../lib/db";
import logger from "../lib/logger";
import { transactionsTable } from "../lib/db/schema";
import { TransactionStatus } from "../types/transactions";

export class TreasuryModel {
    async doesTransactionExist(transaction_id: string): Promise<boolean> {
        try {
            const transactionRows = await db.execute(sql`
                SELECT ${transactionsTable.id} FROM ${transactionsTable} WHERE ${transactionsTable.id} = ${transaction_id} FOR SHARE
            `);

            return transactionRows.rowCount ? transactionRows.rowCount > 0 : false;
        } catch(err) {
            logger.error("Error checking if transaction exists", {error: err, transaction_id});
            throw new Error("Could not check if transaction id exists");
        }
    }

    // Assumes that a transaction with the given ID already exists
    async hasTransactionAlreadyBeenOnramped(transaction_id: string): Promise<boolean> {
        try {
            const onrampedTransaction = await db.execute(sql`
               SELECT ${transactionsTable.id} FROM ${transactionsTable} WHERE ${transactionsTable.id} = ${transaction_id} AND ${transactionsTable.transactionStatus} = ${TransactionStatus.ONRAMPED}
            `);

            return onrampedTransaction.rowCount ? onrampedTransaction.rowCount > 0 : false;
        } catch(err) {
            logger.error("Could not check if transaction has already been onramped in database", {error: err, transaction_id});
            throw new Error("Could not check if transaction has already been onramped");
        }
    }
}

const treasuryModel = new TreasuryModel();
export default treasuryModel;