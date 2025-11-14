import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { treasuryBalanceTable } from "../lib/db/schema";
import logger from "../lib/logger";
import { TOKEN_TYPE } from "../types/token";
import { HederaChainModel } from "./chain/hedera";
import { SUPPORTED_CHAINS } from "../types/chain";
import { divideBigIntWithDecimals } from "../lib/bigIntDivision";

export class LiquidityManagerModel {
    async getCachedTreasuryTokenBalance(token_type: TOKEN_TYPE): Promise<number> {
        try {
            const tokenBalance = await db.select({
                balance: treasuryBalanceTable.balance,
                decimals: treasuryBalanceTable.decimals
            }).from(treasuryBalanceTable)
            .where(eq(treasuryBalanceTable.token, token_type));

            if (tokenBalance.length < 1) {
                return 0;
            } else {
                return divideBigIntWithDecimals(tokenBalance[0].balance, BigInt(tokenBalance[0].decimals));
            }
        } catch(err) {
            logger.error("Error getting cached treasury balance", {error: err, token_type});
            throw new Error("Error getting cached treasury balance");
        }
    }

    async getTreasuryBalanceFromOnchain(token_type: TOKEN_TYPE, hederaChainModel: HederaChainModel): Promise<{balance: BigInt, decimals: number}> {
        try {
            const tokenDetails = await db.select({
                address: treasuryBalanceTable.address,
                treasuryAccount: treasuryBalanceTable.treasuryAccount,
                chain: treasuryBalanceTable.chain,
                decimals: treasuryBalanceTable.decimals
            }).from(treasuryBalanceTable)
            .where(eq(treasuryBalanceTable.token, token_type));

            if (tokenDetails.length < 1) {
                return {balance: BigInt(0), decimals: 0};
            } else {
                const tokenDetail = tokenDetails[0];
                if (tokenDetail.chain === SUPPORTED_CHAINS.HEDERA_MAINNET || tokenDetail.chain === SUPPORTED_CHAINS.HEDERA_TESTNET) {
                    const {balance, decimals} = await hederaChainModel.getTokenBalance(tokenDetail.chain, tokenDetail.treasuryAccount, tokenDetail.address);
                    return {balance, decimals: decimals ?? tokenDetail.decimals};
                }

                return {balance: BigInt(0), decimals: tokenDetail.decimals};
            }
        } catch(err) {
            logger.error("Error getting token balance on chain", {error: err, token_type});
            throw new Error("Error getting token balance on chain");
        }
    }
}

const liquidityModel = new LiquidityManagerModel();
export default liquidityModel;

