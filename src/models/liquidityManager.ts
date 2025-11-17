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
                return divideBigIntWithDecimals(tokenBalance[0].balance, BigInt(Math.pow(10, tokenBalance[0].decimals)));
            }
        } catch(err) {
            logger.error("Liquidity Model: Error getting cached treasury balance", {error: err, token_type});
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
            logger.error("Liquidity Model: Error getting token balance on chain", {error: err, token_type});
            throw new Error("Error getting token balance on chain");
        }
    }

    async deductCachedTreasuryBalance(token: TOKEN_TYPE, amount: number) {
        try {
            const currentBalance = await db.select({
                balance: treasuryBalanceTable.balance,
                decimals: treasuryBalanceTable.decimals
            }).from(treasuryBalanceTable)
            .where(eq(treasuryBalanceTable.token, token));

            if (currentBalance.length > 0) {
                const balance = currentBalance[0];
                const amountSubract = BigInt(amount * Math.pow(10, balance.decimals));
                
                if (balance.balance >= amountSubract) {
                    await db.update(treasuryBalanceTable).set({
                        balance: balance.balance - amountSubract
                    }).where(eq(treasuryBalanceTable.token, token));
                }
            }
        } catch(err) {
            logger.error("Liquidity Model: Error deducting cached treasury balance", {error: err, token, amount});
            throw new Error("Error deducting from cached treasury balance");
        }
    }
}

const liquidityModel = new LiquidityManagerModel();
export default liquidityModel;

