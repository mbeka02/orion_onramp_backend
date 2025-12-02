import { Errors, MyError } from "../errors";
import { EmailService } from "../lib/emails/email.util";
import lock from "../lib/lock";
import logger from "../lib/logger";
import { LiquidityManagerModel } from "../models/liquidityManager";
import { TransactionModel } from "../models/transactions";
import { TreasuryModel } from "../models/treasury";
import { LiquidityManagerController } from "./liquidityManager";

const BALANCE_CHECK_LOCK = "balance_check_lock";
const BUSINESS_TRANSFER_LOCK = "business_transfer_lock";

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

      logger.info("Token transfer pending", { transaction_reference })

      // Get transaction details
      const transaction = await transactionModel.getTransactionByReference(
        transaction_reference,
      );
      if (!transaction) {
        throw new Error("Could not get transaction");
      }

      // Check if treasury has enough
      const amount = transaction.amount / 100;

      // Only allow one check at a time for treasury balance
      const isEnough = await lock.acquire(BALANCE_CHECK_LOCK, async () => {
        return await liquidityManagerController
          .doesTreasuryHaveBalance(
            transaction.token,
            amount,
            liquidityModel,
            emailService,
          )
          .catch((err) => {
            throw new Error("Could not check if treasury had balance", {
              cause: err,
            });
          });
      });
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
          // Only allow one transfer at a time
          await lock
            .acquire(BUSINESS_TRANSFER_LOCK, async () => {
              return await liquidityManagerController.sendTokensToBusiness(
                transaction.environmentID,
                transaction.token,
                amount,
                liquidityModel,
              );
            })
            .catch((err) => {
              if (err instanceof MyError) {
                if (err.message === Errors.BUSINESS_NOT_ASSOCIATED) {
                  logger.info("account not associated", { transaction_reference });
                  throw err;
                }
              }
              throw new Error("Could not send tokens to business", {
                cause: err,
              });
            });
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
        logger.info("Treasury Controller: Payment onramped successfully", {
          transaction: transaction_reference,
        });
      }
    } catch (err) {
      logger.error(
        "Treasury Controller: Error onramping funds from transaction",
        { error: err, transaction_reference: transaction_reference },
      );



      if (err instanceof MyError) {
        if (err.message === Errors.BUSINESS_NOT_ASSOCIATED) {
          logger.info("token transfer failed", { transaction_reference });
          await liquidityManagerController.markTransactionFailed(
            transaction_reference,
            liquidityModel
          );
          throw err;
        }
        throw err;
      }

      await liquidityManagerController.markTransactionFailed(
        transaction_reference,
        liquidityModel
      );

      logger.info("token transfer failed", { transaction_reference });

      throw new Error("Could not onramp fiat on behalf of business");
    }
  }
}

const treasuryController = new TreasuryController();
export default treasuryController;
