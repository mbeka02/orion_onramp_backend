import { sql } from "drizzle-orm";
import { db } from "../lib/db";
import logger from "../lib/logger";
import { transactionsTable } from "../lib/db/schema";

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
}

const treasuryModel = new TreasuryModel();
export default treasuryModel;