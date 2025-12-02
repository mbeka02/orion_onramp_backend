import { Errors, MyError } from "../errors";
import logger from "../lib/logger";
import { TransactionModel } from "../models/transactions";
import { WEBHOOK_CONTROLLER_EVENTS } from "../types/webhook";

export class WebhookController {
    async sendEvent(event: WEBHOOK_CONTROLLER_EVENTS, transaction_reference: string, transactionModel: TransactionModel, failure_reason?: string) {
        try {
            const transactionDetails = await transactionModel.getWebhookControllerTransactionDetails(transaction_reference);
            if (!transactionDetails) {
                throw new MyError(Errors.TRANSACTION_NOT_FOUND);
            }

            if (transactionDetails.business_webhook === null) {
                throw new MyError(Errors.BUSINESS_NOT_HAVE_WEBHOOK);
            }
        } catch(err) {
            logger.error("Webhook Controller Send Event: Error sending event", {error: err, event, transaction_reference});
            if (err instanceof MyError) {
                throw err;
            }
            
            throw new Error("Could not send event");
        }
    }
}

const webhookController = new WebhookController();
export default webhookController;