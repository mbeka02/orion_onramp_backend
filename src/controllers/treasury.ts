import { Errors, MyError } from "../errors";
import logger from "../lib/logger";
import treasuryBalanceQueue from "../lib/queue/treasuryBalanceQueue";
import { LiquidityManagerModel } from "../models/liquidityManager";
import { TransactionModel } from "../models/transactions";
import { TreasuryModel } from "../models/treasury";
import { LiquidityManagerController } from "./liquidityManager";

export class TreasuryController {
    async businessOnramp(transaction_id: string, treasuryModel: TreasuryModel, liquidityManagerController: LiquidityManagerController, transactionModel: TransactionModel, liquidityModel: LiquidityManagerModel) {
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

            // Queue treasury balance checks
            const isEnough = await treasuryBalanceQueue.add(() => liquidityManagerController.doesTreasuryHaveBalance(transaction.token, transaction.amount / 100, liquidityModel)) // convert amount from cents to shillings
            if (isEnough) {
                // Something
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