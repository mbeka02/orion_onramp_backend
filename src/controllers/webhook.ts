import { Errors, MyError } from "../errors";
import { EncryptionService } from "../lib/encryption";
import logger from "../lib/logger";
import { EnvironmentModel } from "../models/environments";
import { TransactionModel } from "../models/transactions";
import { WebhookData, WebhookModel } from "../models/webhook";
import { TRANSACTION_STATUS } from "../types/transactions";
import { WEBHOOK_CONTROLLER_EVENTS } from "../types/webhook";

export class WebhookController {
    async sendEvent(event: WEBHOOK_CONTROLLER_EVENTS, transaction_reference: string, transactionModel: TransactionModel, webhookModel: WebhookModel, environmentModel: EnvironmentModel) {
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

            // Get webhook secret
            const encryptionService = new EncryptionService();
            const webhookDetails = await environmentModel.getEnvironmentWebhookDetails(transactionDetails.environmentID, encryptionService);
            if (!webhookDetails) {
                throw new Error("Could not get webhook details");
            }

            const webhookData: WebhookData = {
                event_type: event,
                order_id: transactionDetails.order_id,
                token: transactionDetails.token,
                amount: transactionDetails.amountInCents / 100,
                currency: transactionDetails.currency,
            }

            // Create signature
            const signature = webhookModel.generateSignature(webhookData, webhookDetails.webhook_secret);

            // Send webhook event
            await webhookModel.sendEvent(webhookData, signature, transactionDetails.business_webhook);
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