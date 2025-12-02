import logger from "../lib/logger";
import { TOKEN_TYPE } from "../types/token";
import { WEBHOOK_CONTROLLER_EVENTS } from "../types/webhook";
import crypto from "crypto";

export interface WebhookData {
  event_type: WEBHOOK_CONTROLLER_EVENTS;
  order_id: string;
  token: TOKEN_TYPE;
  amount: number;
  currency: string | null;
  failureReason?: string;
}

export class WebhookModel {
  generateSignature(data: WebhookData, webhookSecret: string): string {
    try {
      const hash = crypto
        .createHmac("sha512", webhookSecret)
        .update(JSON.stringify(data))
        .digest("hex");
      return hash;
    } catch (err) {
      logger.error("Webhook Model: Error generating signature", { error: err });
      throw new Error("Error generating webhook signature");
    }
  }

  async sendEvent(data: WebhookData, signature: string, webhookURL: string) {
    try {
      const controller = new AbortController();
      const signal = controller.signal;
      const timeOutID = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(webhookURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-orion-signature": signature,
        },
        body: JSON.stringify(data),
        signal: signal,
      });

      clearTimeout(timeOutID);
      if (response.status !== 201) {
        throw new Error(
          `Webhook delivery failed with status code ${response.status}`,
        );
      }
    } catch (err) {
      logger.error("Webhook Model: Error sending webhook event", {
        error: err,
      });

      if (err instanceof Error && err.name === "AbortError") {
        throw new Error("Fetch request timed out");
      }

      throw new Error("Could not send webhook event");
    }
  }
}

const webhookModel = new WebhookModel();
export default webhookModel;