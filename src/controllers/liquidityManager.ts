import logger from "../lib/logger";
import { LiquidityManagerModel } from "../models/liquidityManager";
import { TOKEN_TYPE } from "../types/token";

export class LiquidityManagerController {
    async doesTreasuryHaveBalance(token: TOKEN_TYPE, amount: number, liquidityModel: LiquidityManagerModel): Promise<boolean> {
        try {
            const balance = await liquidityModel.getCachedTreasuryTokenBalance(token);
            if (balance < amount) {
                return false;
            }
        } catch(err) {
            logger.error("Error checking if treasury has balance", {error: err, token, amount});
            throw new Error("Error checking if token has balance");
        }
    }
}

const liquidityManagerController = new LiquidityManagerController();
export default liquidityManagerController;