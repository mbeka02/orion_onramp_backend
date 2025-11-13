import treasuryController from "../../src/controllers/treasury";
import { Errors, MyError } from "../../src/errors";
import { treasuryModelMock } from "../mocks/treasury_model_mock";

describe("Treasury Business SDK Onramp Tests", () => {
    const existing_transaction_id = "existing";
    const non_existing_transaction_id = "not existing";
    const onramped_transaction_id = "onramped transaction";

    beforeAll(async() => {
        treasuryModelMock.doesTransactionExist = jest.fn().mockImplementation((transaction_id: string) => {
            return new Promise((res, rej) => {
                if (transaction_id === existing_transaction_id || transaction_id === onramped_transaction_id) {
                    res(true);
                } else {
                    res(false);
                }
            })
        });

        treasuryModelMock.hasTransactionAlreadyBeenOnramped = jest.fn().mockImplementation((transaction_id: string) => {
            return new Promise((res, rej) => {
                if (transaction_id === onramped_transaction_id) {
                    res(true);
                } else {
                    res(false);
                }
            })
        })
    });

    it("should fail if transaction id doesn't exist", async () => {
        try {
            await treasuryController.businessOnramp(non_existing_transaction_id, treasuryModelMock);
            expect(false).toBe(true);
        } catch(err) {
            if (err instanceof MyError) {
                if (err.message === Errors.UNAUTHORIZED_PAYMENT) {
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

    it("should fail if transaction exists but has already been onramped", async () => {
        try {
            await treasuryController.businessOnramp(onramped_transaction_id, treasuryModelMock);
            expect(false).toBe(true);
        } catch(err) {
            if (err instanceof MyError) {
                if (err.message === Errors.PAYMENT_ALREADY_ONRAMPED) {
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