import logger from "../lib/logger";
import { WEBHOOK_CONTROLLER_EVENTS } from "../types/webhook";

export class WebhookController {
    async sendEvent(event: WEBHOOK_CONTROLLER_EVENTS, transaction_identifier: string, failure_reason?: string) {
        try {

        } catch(err) {
            logger.error("Webhook Controller Send Event: Error sending event", {error: err, event, transaction_identifier});
            throw new Error("Could not send event");
        }
    }
}

const webhookController = new WebhookController();
export default webhookController;