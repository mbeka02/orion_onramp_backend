import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { businesses, environmentsTable, treasuryBalanceTable } from "../lib/db/schema";
import logger from "../lib/logger";
import { TOKEN_TYPE } from "../types/token";
import hederaChainModel, { HederaChainModel } from "./chain/hedera";
import { SUPPORTED_CHAINS } from "../types/chain";
import { divideBigIntWithDecimals } from "../lib/bigIntDivision";
import { Errors, MyError } from "../errors";

interface BusinessTransactionDetails {
    token_type: TOKEN_TYPE,
    treasury_account: string,
    token_address: string,
    business_crypto_account: string,
    amount_with_decimals: number
}

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

    async getTransactionDetailsForBusinessTransfer(environment_id: string, tokenType: TOKEN_TYPE, amount: number): Promise<BusinessTransactionDetails> {
        try {
            const businessDetails = await db.select({
                business_crypto_account: businesses.cryptoWalletAddress
            }).from(environmentsTable)
            .innerJoin(businesses, eq(environmentsTable.businessID, businesses.id))
            .where(eq(environmentsTable.id, environment_id))
            .limit(1);

            if (businessDetails.length < 1) {
                throw new Error("Could not get business details");
            }

            const business = businessDetails[0];
            if (!business.business_crypto_account) {
                throw new MyError(Errors.BUSINESS_NOT_SET_WALLET);
            }

            const tokenDetails = await db.select({
                treasury_account: treasuryBalanceTable.treasuryAccount,
                token_address: treasuryBalanceTable.address,
                decimals: treasuryBalanceTable.decimals
            }).from(treasuryBalanceTable)
            .where(eq(treasuryBalanceTable.token, tokenType))
            .limit(1);

            if (tokenDetails.length < 1) {
                throw new Error("Could not get token details");
            }

            const token = tokenDetails[0];

            return {
                token_type: tokenType,
                treasury_account: token.treasury_account,
                token_address: token.token_address,
                business_crypto_account: business.business_crypto_account,
                amount_with_decimals: amount * Math.pow(10, token.decimals)
            }
        } catch(err) {
            logger.error("Liquidity Manager Model: Could not get details needed for business transfer", {error: err, tokenType});
            if (err instanceof MyError) {
                throw err;
            }
            throw new Error("Could not get transaction details needed for business transfer");
        }
    }

    async sendTokensToAccount(details: BusinessTransactionDetails) {
        try {
            if (details.token_type === TOKEN_TYPE.KESy_TESTNET) {
                await hederaChainModel.transferTokenFromTreasuryToAccount(
                    details.token_type, 
                    details.treasury_account, 
                    details.token_address, 
                    details.business_crypto_account, 
                    details.amount_with_decimals
                );
            } else {
                throw new Error("Token type not supported");
            }
        } catch(err) {
            logger.error("Liquidity Manager Model: Error sending tokens to account", {error: err, details});
            if (err instanceof MyError) {
                if (err.message === Errors.RECEIVER_NOT_ASSOCIATED) {
                    throw new MyError(Errors.BUSINESS_NOT_ASSOCIATED);
                }
                
                throw err;
            }
            throw new Error("Could not send tokens");
        }
    }
}

const liquidityModel = new LiquidityManagerModel();
export default liquidityModel;

