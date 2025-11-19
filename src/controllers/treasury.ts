import { Errors, MyError } from "../errors";
import { EmailService } from "../lib/emails/email.util";
import logger from "../lib/logger";
import { LiquidityManagerModel } from "../models/liquidityManager";
import { TransactionModel } from "../models/transactions";
import { TreasuryModel } from "../models/treasury";
import { LiquidityManagerController } from "./liquidityManager";

export class TreasuryController {
    async businessOnramp(transaction_id: string, treasuryModel: TreasuryModel, liquidityManagerController: LiquidityManagerController, transactionModel: TransactionModel, liquidityModel: LiquidityManagerModel, emailService: EmailService) {
        try {
            const doesTransactionExist = await treasuryModel.doesTransactionExist(transaction_id);
            if (doesTransactionExist === false) {
                throw new MyError(Errors.UNAUTHORIZED_PAYMENT);
            }

            const transactionAlreadyOnramped = await treasuryModel.hasTransactionAlreadyBeenOnramped(transaction_id);
            if (transactionAlreadyOnramped === true) {
                throw new MyError(Errors.PAYMENT_ALREADY_ONRAMPED);
            }

            const isPaymentCompleteSuccessfully = await treasuryModel.isFiatPaymentCompleted(transaction_id);
            if (isPaymentCompleteSuccessfully === false) {
                throw new MyError(Errors.PAYMENT_NOT_COMPLETE);
            }

            // Get transaction details
            const transaction = await transactionModel.getTransactionById(transaction_id);
            if (!transaction) {
                throw new Error("Could not get transaction");
            }

            // Check if treasury has enough
            const isEnough = await liquidityManagerController.doesTreasuryHaveBalance(transaction.token, transaction.amount / 100, liquidityModel);
            if (isEnough === false) {
                // Send request for more tokens
                await liquidityManagerController.getMoreTokens(transaction.token, emailService, transaction.amount / 100);
                throw new MyError(Errors.TREASURY_DOES_NOT_HAVE_ENOUGH);
            }
        } catch(err) {
            logger.error("Treasury Controller: Error onramping funds from transaction", {error: err, transaction_id});

            if (err instanceof MyError) {
                throw err;
            } 

            throw new Error("Could not onramp fiat on behalf of business");
        }
    }
}

const treasuryController = new TreasuryController();
export default treasuryController;