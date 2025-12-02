import webhookController from "../../src/controllers/webhook";
import { Errors, MyError } from "../../src/errors"
import { transactionModel } from "../../src/models/transactions";
import { TOKEN_TYPE } from "../../src/types/token";
import { TRANSACTION_STATUS } from "../../src/types/transactions";
import { WEBHOOK_CONTROLLER_EVENTS } from "../../src/types/webhook";

describe("Webhook Controller: Send Event tests", () => {
    const nonExistentTransactionRef = "non existent";
    const noWebhookTransactionRef = "no webhook";
    const paymentRequestPendingTransactionRef = "payment request pending";
    const paymentRequestSuccessTransactionRef = "payment request success";
    const chargeSuccessTransactionRef = "charge success";
    const chargeFailedTransactionRef = "charge failed";
    const tokenTransferPendingRef = "token transfer pending";
    const tokenTransferSuccessRef = "token transfer success";
    const accountNotAssociatedRef = "account not associated";
    const tokenTransferFailedRef = "token transfer failed";

    const businessWebhook = "webhook";
    const order_id = "order id";
    const token = TOKEN_TYPE.KESy_TESTNET;
    const amountInCents = 1000;
    const currency = "KES"

    beforeAll(async () => {
        transactionModel.getWebhookControllerTransactionDetails = jest.fn().mockImplementation((transaction_reference: string) => {
            return new Promise((res, rej) => {
                if (transaction_reference === nonExistentTransactionRef) {
                    res(null);
                } else if (transaction_reference === noWebhookTransactionRef) {
                    res({
                        transaction_reference,
                        business_webhook: null,
                        transaction_status: TRANSACTION_STATUS.PENDING,
                        order_id,
                        token,
                        amountInCents,
                        currency
                    })
                } else if (transaction_reference === paymentRequestPendingTransactionRef) {
                    res({
                        transaction_reference,
                        businessWebhook,
                        transaction_status: TRANSACTION_STATUS.FAILED,
                        order_id,
                        token,
                        amountInCents,
                        currency
                    })
                } else if (transaction_reference === paymentRequestSuccessTransactionRef) {
                    res({
                        transaction_reference,
                        businessWebhook,
                        transaction_status: TRANSACTION_STATUS.FAILED,
                        order_id,
                        token,
                        amountInCents,
                        currency
                    })
                } else if (transaction_reference === chargeSuccessTransactionRef) {
                    res({
                        transaction_reference,
                        businessWebhook,
                        transaction_status: TRANSACTION_STATUS.FAILED,
                        order_id,
                        token,
                        amountInCents,
                        currency
                    })
                } else if (transaction_reference === chargeFailedTransactionRef) {
                    res({
                        transaction_reference,
                        businessWebhook,
                        transaction_status: TRANSACTION_STATUS.SUCCESSFUL,
                        order_id,
                        token,
                        amountInCents,
                        currency
                    })
                } else if (transaction_reference === tokenTransferPendingRef) {
                    res({
                        transaction_reference,
                        businessWebhook,
                        transaction_status: TRANSACTION_STATUS.FAILED,
                        order_id,
                        token,
                        amountInCents,
                        currency
                    })
                } else if (transaction_reference === tokenTransferSuccessRef) {
                    res({
                        transaction_reference,
                        businessWebhook,
                        transaction_status: TRANSACTION_STATUS.FAILED,
                        order_id,
                        token,
                        amountInCents,
                        currency
                    })
                } else if (transaction_reference === accountNotAssociatedRef) {
                    res({
                        transaction_reference,
                        businessWebhook,
                        transaction_status: TRANSACTION_STATUS.SUCCESSFUL,
                        order_id,
                        token,
                        amountInCents,
                        currency
                    })
                } else if (transaction_reference === tokenTransferFailedRef) {
                    res({
                        transaction_reference,
                        businessWebhook,
                        transaction_status: TRANSACTION_STATUS.SUCCESSFUL,
                        order_id,
                        token,
                        amountInCents,
                        currency
                    })
                } else {
                    rej("Unexpected input");
                }
            })
        })
    })

    it("should fail if transaction identifier does not exist", async () => {
        try {
            await webhookController.sendEvent(WEBHOOK_CONTROLLER_EVENTS.ACCOUNT_NOT_ASSOCIATED, nonExistentTransactionRef, transactionModel);
            expect(false).toBe(true);
        } catch (err) {
            if (err instanceof MyError) {
                if (err.message === Errors.TRANSACTION_NOT_FOUND) {
                    expect(true).toBe(true);
                } else {
                    console.error("Unexpected error", err);
                    expect(false).toBe(true);
                }
            } else {
                console.error("Unexpected error", err);
                expect(false).toBe(true);
            }
        }
    });

    it("should fail if business does not have a webhook", async () => {
        try {
            await webhookController.sendEvent(WEBHOOK_CONTROLLER_EVENTS.ACCOUNT_NOT_ASSOCIATED, noWebhookTransactionRef, transactionModel);
            expect(false).toBe(true);
        } catch (err) {
            if (err instanceof MyError) {
                if (err.message === Errors.BUSINESS_NOT_HAVE_WEBHOOK) {
                    expect(true).toBe(true);
                } else {
                    console.error("Unexpected error", err);
                    expect(false).toBe(true);
                }
            } else {
                console.error("Unexpected error", err);
                expect(false).toBe(true);
            }
        }
    });

    it("should fail if event is payment request pending but status is not pending", async () => {
        try {
            await webhookController.sendEvent(WEBHOOK_CONTROLLER_EVENTS.PAYMENT_REQUEST_PENDING, paymentRequestPendingTransactionRef, transactionModel);
            expect(false).toBe(true);
        } catch (err) {
            if (err instanceof MyError) {
                if (err.message === Errors.TRANSACTION_STATUS_MISMATCH) {
                    expect(true).toBe(true);
                } else {
                    console.error("Unexpected error", err);
                    expect(false).toBe(true);
                }
            } else {
                console.error("Unexpected error", err);
                expect(false).toBe(true);
            }
        }
    });

    it("should fail if event is payment request success but status is not pending", async () => {
        try {
            await webhookController.sendEvent(WEBHOOK_CONTROLLER_EVENTS.PAYMENT_REQUEST_SUCCESS, paymentRequestSuccessTransactionRef, transactionModel);
            expect(false).toBe(true);
        } catch (err) {
            if (err instanceof MyError) {
                if (err.message === Errors.TRANSACTION_STATUS_MISMATCH) {
                    expect(true).toBe(true);
                } else {
                    console.error("Unexpected error", err);
                    expect(false).toBe(true);
                }
            } else {
                console.error("Unexpected error", err);
                expect(false).toBe(true);
            }
        }
    });

    it("should fail if event is charge success but status is not success", async () => {
        try {
            await webhookController.sendEvent(WEBHOOK_CONTROLLER_EVENTS.CHARGE_SUCCESS, chargeSuccessTransactionRef, transactionModel);
            expect(false).toBe(true);
        } catch (err) {
            if (err instanceof MyError) {
                if (err.message === Errors.TRANSACTION_STATUS_MISMATCH) {
                    expect(true).toBe(true);
                } else {
                    console.error("Unexpected error", err);
                    expect(false).toBe(true);
                }
            } else {
                console.error("Unexpected error", err);
                expect(false).toBe(true);
            }
        }
    });

    it("should fail if event is charge failed but status is not failed", async () => {
        try {
            await webhookController.sendEvent(WEBHOOK_CONTROLLER_EVENTS.CHARGE_FAILED, chargeFailedTransactionRef, transactionModel);
            expect(false).toBe(true);
        } catch (err) {
            if (err instanceof MyError) {
                if (err.message === Errors.TRANSACTION_STATUS_MISMATCH) {
                    expect(true).toBe(true);
                } else {
                    console.error("Unexpected error", err);
                    expect(false).toBe(true);
                }
            } else {
                console.error("Unexpected error", err);
                expect(false).toBe(true);
            }
        }
    });

    it("should fail if event is token transfer pending but status is not success", async () => {
        try {
            await webhookController.sendEvent(WEBHOOK_CONTROLLER_EVENTS.TOKEN_TRANSFER_PENDING, tokenTransferPendingRef, transactionModel);
            expect(false).toBe(true);
        } catch (err) {
            if (err instanceof MyError) {
                if (err.message === Errors.TRANSACTION_STATUS_MISMATCH) {
                    expect(true).toBe(true);
                } else {
                    console.error("Unexpected error", err);
                    expect(false).toBe(true);
                }
            } else {
                console.error("Unexpected error", err);
                expect(false).toBe(true);
            }
        }
    });

    it("should fail if event is token transfer success but status is not onramped", async () => {
        try {
            await webhookController.sendEvent(WEBHOOK_CONTROLLER_EVENTS.TOKEN_TRANSFER_SUCCESS, tokenTransferSuccessRef, transactionModel);
            expect(false).toBe(true);
        } catch (err) {
            if (err instanceof MyError) {
                if (err.message === Errors.TRANSACTION_STATUS_MISMATCH) {
                    expect(true).toBe(true);
                } else {
                    console.error("Unexpected error", err);
                    expect(false).toBe(true);
                }
            } else {
                console.error("Unexpected error", err);
                expect(false).toBe(true);
            }
        }
    });

    it("should fail if event is token transfer success but status is not onramped", async () => {
        try {
            await webhookController.sendEvent(WEBHOOK_CONTROLLER_EVENTS.ACCOUNT_NOT_ASSOCIATED, accountNotAssociatedRef, transactionModel);
            expect(false).toBe(true);
        } catch (err) {
            if (err instanceof MyError) {
                if (err.message === Errors.TRANSACTION_STATUS_MISMATCH) {
                    expect(true).toBe(true);
                } else {
                    console.error("Unexpected error", err);
                    expect(false).toBe(true);
                }
            } else {
                console.error("Unexpected error", err);
                expect(false).toBe(true);
            }
        }
    });

    it("should fail if event is token transfer failed but status is not failed", async () => {
        try {
            await webhookController.sendEvent(WEBHOOK_CONTROLLER_EVENTS.TOKEN_TRANSFER_FAILED, tokenTransferFailedRef, transactionModel);
            expect(false).toBe(true);
        } catch (err) {
            if (err instanceof MyError) {
                if (err.message === Errors.TRANSACTION_STATUS_MISMATCH) {
                    expect(true).toBe(true);
                } else {
                    console.error("Unexpected error", err);
                    expect(false).toBe(true);
                }
            } else {
                console.error("Unexpected error", err);
                expect(false).toBe(true);
            }
        }
    });
})