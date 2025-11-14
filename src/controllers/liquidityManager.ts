import logger from "../lib/logger";
import { LiquidityManagerModel } from "../models/liquidityManager";
import { TOKEN_TYPE } from "../types/token";

export class LiquidityManagerController {
    async getCachedTreasuryBalance(token: TOKEN_TYPE, liquidityModel: LiquidityManagerModel): Promise<number> {
        try {
            const balance = await liquidityModel.getCachedTreasuryTokenBalance(token);
            return balance;
        } catch(err) {
            logger.error("Error getting treasury balance", {error: err, token});
            throw new Error("Error getting treasury balance");
        }
    }
}

const liquidityMangerController = new LiquidityManagerController();
export default liquidityMangerController;