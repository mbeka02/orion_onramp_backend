import { EmailService } from "../lib/emails/email.util";
import logger from "../lib/logger";
import { LiquidityManagerModel } from "../models/liquidityManager";
import { TOKEN_TYPE } from "../types/token";

export class LiquidityManagerController {
    async doesTreasuryHaveBalance(token: TOKEN_TYPE, amount: number, liquidityModel: LiquidityManagerModel): Promise<boolean> {
        try {
            const balance = await liquidityModel.getCachedTreasuryTokenBalance(token);
            if (balance < amount) {
                return false;
            } else {
                // Optimistically deduct balance
                await liquidityModel.deductCachedTreasuryBalance(token, amount);

                return true;
            }
        } catch(err) {
            logger.error("Error checking if treasury has balance", {error: err, token, amount});
            throw new Error("Error checking if token has balance");
        }
    }

    async getMoreTokens(token: TOKEN_TYPE, emailService: EmailService, amount?: number) {
        try {
            await emailService.topUpTreasury(token, amount);
        } catch(err) {
            logger.error("Could not get more of token", {error: err, token, amount});
            throw new Error("Could not inform of more tokens");
        }
    }
}

const liquidityManagerController = new LiquidityManagerController();
export default liquidityManagerController;