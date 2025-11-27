import { Errors, MyError } from "../errors";
import { EmailService } from "../lib/emails/email.util";
import logger from "../lib/logger";
import { LiquidityManagerModel } from "../models/liquidityManager";
import { TransactionModel } from "../models/transactions";
import { TreasuryModel } from "../models/treasury";
import { LiquidityManagerController } from "./liquidityManager";

export class TreasuryController {
  async businessOnramp(
    transaction_reference: string,
    treasuryModel: TreasuryModel,
    liquidityManagerController: LiquidityManagerController,
    transactionModel: TransactionModel,
    liquidityModel: LiquidityManagerModel,
    emailService: EmailService,
  ) {
    try {
      const doesTransactionExist = await treasuryModel.doesTransactionExist(
        transaction_reference,
      );
      if (doesTransactionExist === false) {
        throw new MyError(Errors.UNAUTHORIZED_PAYMENT);
      }

      const transactionAlreadyOnramped =
        await treasuryModel.hasTransactionAlreadyBeenOnramped(
          transaction_reference,
        );
      if (transactionAlreadyOnramped === true) {
        throw new MyError(Errors.PAYMENT_ALREADY_ONRAMPED);
      }

      const isPaymentCompleteSuccessfully =
        await treasuryModel.isFiatPaymentCompleted(transaction_reference);
      if (isPaymentCompleteSuccessfully === false) {
        throw new MyError(Errors.PAYMENT_NOT_COMPLETE);
      }

      // Get transaction details
      const transaction = await transactionModel.getTransactionByReference(
        transaction_reference,
      );
      if (!transaction) {
        throw new Error("Could not get transaction");
      }

      // Check if treasury has enough
      const amount = transaction.amount / 100;
      const isEnough = await liquidityManagerController.doesTreasuryHaveBalance(
        transaction.token,
        amount,
        liquidityModel,
        emailService,
      );
      if (isEnough === false) {
        // Send request for more tokens
        await liquidityManagerController.getMoreTokens(
          transaction.token,
          emailService,
          amount,
        );
        throw new MyError(Errors.TREASURY_DOES_NOT_HAVE_ENOUGH);
      } else {
        try {
          await liquidityManagerController.sendTokensToBusiness(
            transaction.environmentID,
            transaction.token,
            amount,
            liquidityModel,
          );
        } catch (err) {
          logger.error("Treasury Controller: Error sending tokens", {
            error: err,
            transaction_reference: transaction_reference,
          });
          await liquidityManagerController.undoCacheDeduct(
            transaction.token,
            amount,
            liquidityModel,
          );
          throw err;
        }

        try {
          await liquidityManagerController.markTransactionOnramped(
            transaction_reference,
            liquidityModel,
          );
        } catch (err) {
          logger.error(
            "Treasury Controller: Tokens sent but failed to mark as onramped",
            { error: err, transaction_reference },
          );
          // NOT THROWING AN ERROR SINCE TOKENS HAVE ALREADY BEEN SENT
        }
        logger.info("Treasury Controller: Payment onramped succesfully", {transaction: transaction_reference})
      }
    } catch (err) {
      logger.error(
        "Treasury Controller: Error onramping funds from transaction",
        { error: err, transaction_reference: transaction_reference },
      );

      if (err instanceof MyError) {
        throw err;
      }

      throw new Error("Could not onramp fiat on behalf of business");
    }
  }
}

const treasuryController = new TreasuryController();
export default treasuryController;
