import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { treasuryBalanceTable } from "../lib/db/schema";
import logger from "../lib/logger";
import { TOKEN_TYPE } from "../types/token";

export class LiquidityManagerModel {
    async getCachedTokenBalance(token_type: TOKEN_TYPE): Promise<number> {
        try {
            const tokenBalance = await db.select({
                balance: treasuryBalanceTable.balance
            }).from(treasuryBalanceTable)
            .where(eq(treasuryBalanceTable.token, token_type));

            if (tokenBalance.length < 1) {
                return 0;
            } else {
                return tokenBalance[0].balance;
            }
        } catch(err) {
            logger.error("Error getting cached treasury balance", {error: err, token_type});
            throw new Error("Error getting cached treasury balance");
        }
    }
}

const liquidityModel = new LiquidityManagerModel();
export default liquidityModel;

