import { Errors, MyError } from "../errors";
import logger from "../lib/logger";
import { TreasuryModel } from "../models/treasury";

export class TreasuryController {
    async businessOnramp(transaction_id: string, treasuryModel: TreasuryModel) {
        try {
            const doesTransactionExist = await treasuryModel.doesTransactionExist(transaction_id);
            if (doesTransactionExist === false) {
                throw new MyError(Errors.UNAUTHORIZED_PAYMENT);
            }

            const transactionAlreadyOnramped = await treasuryModel.hasTransactionAlreadyBeenOnramped(transaction_id);
            if (transactionAlreadyOnramped === true) {
                throw new MyError(Errors.PAYMENT_ALREADY_ONRAMPED);
            }
        } catch(err) {
            logger.error("Error onramping funds from transaction", {error: err, transaction_id});

            if (err instanceof MyError) {
                throw err;
            } 

            throw new Error("Could not onramp fiat on behalf of business");
        }
    }
}

const treasuryController = new TreasuryController();
export default treasuryController;