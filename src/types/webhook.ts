import { z } from "zod";

export enum WEBHOOK_CONTROLLER_EVENTS {
  CHARGE_SUCCESS = "charge_success",
  CHARGE_FAILED = "charge_failed",
  TOKEN_TRANSFER_PENDING = "token_transfer_pending",
  TOKEN_TRANSFER_SUCCESS = "token_transfer_success",
  ACCOUNT_NOT_ASSOCIATED = "account_not_associated",
  TOKEN_TRANSFER_FAILED = "token_transfer_failed",
}

export const webhookControllerMetaDataParser = z.object({
  orderID: z.string(),
});

export const webhookControllerPaystackResponseParser = z.object({
  currency: z.string(),
});
