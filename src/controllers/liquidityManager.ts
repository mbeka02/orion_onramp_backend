import { Errors, MyError } from "../errors";
import { EmailService } from "../lib/emails/email.util";
import logger from "../lib/logger";
import sleep from "../lib/sleep";
import { LiquidityManagerModel } from "../models/liquidityManager";
import { TOKEN_TYPE } from "../types/token";

const MINIMUM_TOKEN_BALANCE_TREASURY = 300000;

const MAX_RETRIES = 5;

export class LiquidityManagerController {
  async doesTreasuryHaveBalance(
    token: TOKEN_TYPE,
    amount: number,
    liquidityModel: LiquidityManagerModel,
    emailService: EmailService,
  ): Promise<boolean> {
    try {
      const balance = await liquidityModel.getCachedTreasuryTokenBalance(token);
      if (balance < amount) {
        return false;
      } else {
        // Optimistically deduct balance
        await liquidityModel.deductCachedTreasuryBalance(token, amount);

        if (balance - amount <= MINIMUM_TOKEN_BALANCE_TREASURY) {
          await this.getMoreTokens(token, emailService);
        }
        return true;
      }
    } catch (err) {
      logger.error("Error checking if treasury has balance", {
        error: err,
        token,
        amount,
      });
      throw new Error("Error checking if token has balance");
    }
  }

  async getMoreTokens(
    token: TOKEN_TYPE,
    emailService: EmailService,
    amount?: number,
  ) {
    try {
      await emailService.topUpTreasury(token, amount);
    } catch (err) {
      logger.error("Could not get more of token", {
        error: err,
        token,
        amount,
      });
      throw new Error("Could not inform of more tokens");
    }
  }

  async sendTokensToBusiness(
    environment_id: string,
    token_type: TOKEN_TYPE,
    amount: number,
    liquidityModel: LiquidityManagerModel,
    crypto_account: string | null,
  ) {
    try {
      // Get transaction details
      const details =
        await liquidityModel.getTransactionDetailsForBusinessTransfer(
          environment_id,
          token_type,
          amount,
        );

      // Send tokens to account if provided
      if (crypto_account) {
        await liquidityModel.sendTokensToAccount({
          ...details,
          business_crypto_account: crypto_account,
        });
      } else {
        if (details.business_crypto_account) {
          await liquidityModel.sendTokensToAccount({
            ...details,
            business_crypto_account: details.business_crypto_account!,
          });
        } else {
          throw new MyError(Errors.BUSINESS_NOT_SET_WALLET);
        }
      }
    } catch (err) {
      logger.error(
        "Liquidity Manager Controller: Error sending tokens to business",
        { error: err },
      );
      if (err instanceof MyError) {
        throw err;
      }

      throw new Error("Could not send tokens to business");
    }
  }

  async undoCacheDeduct(
    token: TOKEN_TYPE,
    amount: number,
    liquidityModel: LiquidityManagerModel,
    retry: number = 1,
    sleepMs: number = 2,
  ) {
    try {
      await liquidityModel.undoTreasuryCachedBalanceDeduct(token, amount);
    } catch (err) {
      logger.error("Liquidity Manager Controller: Undo cache deduct failed", {
        error: err,
        token,
        amount,
        retry,
      });
      if (retry < MAX_RETRIES) {
        await sleep(sleepMs ** retry * 1000);
        await this.undoCacheDeduct(
          token,
          amount,
          liquidityModel,
          retry + 1,
          sleepMs,
        );
      } else {
        throw new Error("Could not undo cache deduct");
      }
    }
  }

  async markTransactionOnramped(
    transaction_reference: string,
    liquidityModel: LiquidityManagerModel,
    retry: number = 1,
    sleepMs: number = 2,
  ) {
    try {
      await liquidityModel.markTransactionAsOnramped(transaction_reference);
    } catch (err) {
      logger.error(
        "Liquidity Manager Controller: Could not mark transaction as onramped",
        { error: err, transaction_reference },
      );
      if (retry < MAX_RETRIES) {
        await sleep(sleepMs ** retry * 1000);
        await this.markTransactionOnramped(
          transaction_reference,
          liquidityModel,
          retry + 1,
          sleepMs,
        );
      } else {
        throw new Error("Could not mark transaction as onramped");
      }
    }
  }

  async markTransactionFailed(
    transaction_reference: string,
    liquidityModel: LiquidityManagerModel,
    retry: number = 1,
    sleepMs: number = 2,
  ) {
    try {
      await liquidityModel.markTransactionAsFailed(transaction_reference);
    } catch (err) {
      logger.error(
        "Liquidity Manager Controller: Could not mark transaction as failed",
        { error: err, transaction_reference },
      );
      if (retry < MAX_RETRIES) {
        await sleep(sleepMs ** retry * 1000);
        await this.markTransactionFailed(
          transaction_reference,
          liquidityModel,
          retry + 1,
          sleepMs,
        );
      } else {
        throw new Error("Could not mark transaction as failed");
      }
    }
  }
}

const liquidityManagerController = new LiquidityManagerController();
export default liquidityManagerController;
