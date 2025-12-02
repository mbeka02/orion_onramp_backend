import webhookController from "../../src/controllers/webhook";
import { Errors, MyError } from "../../src/errors"
import { transactionModel } from "../../src/models/transactions";
import { TOKEN_TYPE } from "../../src/types/token";
import { TRANSACTION_STATUS } from "../../src/types/transactions";
import { WEBHOOK_CONTROLLER_EVENTS } from "../../src/types/webhook";

describe("Webhook Controller: Send Event tests", () => {
    const nonExistentTransactionRef = "non existent";
    const noWebhookTransactionRef = "no webhook";

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
        } catch(err) {
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
        } catch(err) {
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
    })
})