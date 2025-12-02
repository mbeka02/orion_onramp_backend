import { Errors, MyError } from "../errors";
import logger from "../lib/logger";
import { TransactionModel } from "../models/transactions";
import { TRANSACTION_STATUS } from "../types/transactions";
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

            if (event === WEBHOOK_CONTROLLER_EVENTS.PAYMENT_REQUEST_PENDING || event === WEBHOOK_CONTROLLER_EVENTS.PAYMENT_REQUEST_SUCCESS) {
                if (transactionDetails.transaction_status !== TRANSACTION_STATUS.PENDING) {
                    throw new MyError(Errors.TRANSACTION_STATUS_MISMATCH);
                }
            } else if (event === WEBHOOK_CONTROLLER_EVENTS.CHARGE_SUCCESS) {
                if (transactionDetails.transaction_status !== TRANSACTION_STATUS.SUCCESSFUL) {
                    throw new MyError(Errors.TRANSACTION_STATUS_MISMATCH);
                }
            } else if (event === WEBHOOK_CONTROLLER_EVENTS.CHARGE_FAILED) {
                if (transactionDetails.transaction_status !== TRANSACTION_STATUS.FAILED) {
                    throw new MyError(Errors.TRANSACTION_STATUS_MISMATCH);
                }
            } else if (event === WEBHOOK_CONTROLLER_EVENTS.TOKEN_TRANSFER_PENDING) {
                if (transactionDetails.transaction_status !== TRANSACTION_STATUS.SUCCESSFUL) {
                    throw new MyError(Errors.TRANSACTION_STATUS_MISMATCH);
                }
            } else if (event === WEBHOOK_CONTROLLER_EVENTS.TOKEN_TRANSFER_SUCCESS) {
                if (transactionDetails.transaction_status !== TRANSACTION_STATUS.ONRAMPED) {
                    throw new MyError(Errors.TRANSACTION_STATUS_MISMATCH);
                }
            } else if (event === WEBHOOK_CONTROLLER_EVENTS.ACCOUNT_NOT_ASSOCIATED) {
                if (transactionDetails.transaction_status !== TRANSACTION_STATUS.FAILED) {
                    throw new MyError(Errors.TRANSACTION_STATUS_MISMATCH);
                }
            } else if (event === WEBHOOK_CONTROLLER_EVENTS.TOKEN_TRANSFER_FAILED) {
                if (transactionDetails.transaction_status !== TRANSACTION_STATUS.FAILED) {
                    throw new MyError(Errors.TRANSACTION_STATUS_MISMATCH);
                }
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