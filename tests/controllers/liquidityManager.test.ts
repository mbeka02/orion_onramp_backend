import liquidityManagerController from "../../src/controllers/liquidityManager";
import { Errors, MyError } from "../../src/errors";
import { TOKEN_TYPE } from "../../src/types/token"
import { emailServiceMock } from "../mocks/email_service_mock";
import { liquidityModelMock } from "../mocks/liquidity_model_mock";

describe("Liquidity Managers Tests: Treasury Balance checker", () => {
    const token = TOKEN_TYPE.KESy_MAINNET;
    const tooMuch = 100000000;
    const enough = 1000000;
    const safeBalanceCheck = 10;
    const otherToken = TOKEN_TYPE.KESy_TESTNET;
    const otherBalance = 299999;

    beforeAll(async () => {
        liquidityModelMock.getCachedTreasuryTokenBalance = jest.fn().mockImplementation((token_type) => {
            return new Promise((res, rej) => {
                if (token_type === token) {
                    res(enough);
                } else if (token_type === otherToken) {
                    res(otherBalance);
                } else {
                    res(0);
                }
            })
        });
    })

    it("should return false if treasury does not have balance", async () => {
        const isEnough = await liquidityManagerController.doesTreasuryHaveBalance(token, tooMuch, liquidityModelMock, emailServiceMock);
        expect(isEnough).toBe(false);
        expect(liquidityModelMock.deductCachedTreasuryBalance).toHaveBeenCalledTimes(0);
    });

    it("should return true if treasury has balance and deduct from cache", async () => {
        const isEnough = await liquidityManagerController.doesTreasuryHaveBalance(token, safeBalanceCheck, liquidityModelMock, emailServiceMock);

        expect(isEnough).toBe(true);
        expect(liquidityModelMock.deductCachedTreasuryBalance).toHaveBeenCalledWith(token, safeBalanceCheck);
    });

    it("should contact someone if balance is below threshold", async () => {
        const isEnough = await liquidityManagerController.doesTreasuryHaveBalance(otherToken, safeBalanceCheck, liquidityModelMock, emailServiceMock);

        expect(isEnough).toBe(true);
        expect(liquidityModelMock.deductCachedTreasuryBalance).toHaveBeenCalledWith(otherToken, safeBalanceCheck);
        expect(emailServiceMock.topUpTreasury).toHaveBeenCalledWith(otherToken, undefined)
    })
});

describe("Liquidity Manager Tests: Send Tokens To Business", () => {
    const environment_no_wallet = "no wallet";
    const environment_not_associated = "not associated";
    const environment_too_much = "amount is too big";
    const good_environment = "good";
    const notAssociatedAccount = "not associated";
    const tooMuchAccount = "too much";
    const goodAccount = "good";
    const treasuryAccount = "treasury";
    const token = "token";
    const amount = 10;
    const amountWithDecimals = amount * Math.pow(10, 2)
    const tokenType = TOKEN_TYPE.KESy_TESTNET

    beforeAll(async () => {
        liquidityModelMock.getTransactionDetailsForBusinessTransfer = jest.fn().mockImplementation((environment_id, token_type, amount) => {
            return new Promise((res, rej) => {
                if (environment_id === environment_no_wallet) {
                    rej(new MyError(Errors.BUSINESS_NOT_SET_WALLET));
                } else if (environment_id === environment_not_associated) {
                    res({
                        token_type: tokenType,
                        treasury_account: treasuryAccount,
                        token_address: token,
                        business_crypto_account: notAssociatedAccount,
                        amount_with_decimals: amountWithDecimals
                    });
                } else if (environment_id === environment_too_much) {
                    res({
                        token_type: tokenType,
                        treasury_account: treasuryAccount,
                        token_address: token,
                        business_crypto_account: tooMuchAccount,
                        amount_with_decimals: amountWithDecimals
                    });
                } else if (environment_id === good_environment) {
                    res({
                        token_type: tokenType,
                        treasury_account: treasuryAccount,
                        token_address: token,
                        business_crypto_account: goodAccount,
                        amount_with_decimals: amountWithDecimals
                    });
                }
            })
        });

        liquidityModelMock.sendTokensToAccount = jest.fn().mockImplementation((details) => {
            return new Promise((res, rej) => {
                if (details.business_crypto_account === notAssociatedAccount) {
                    rej(new MyError(Errors.BUSINESS_NOT_ASSOCIATED));
                } else if (details.business_crypto_account === tooMuchAccount) {
                    rej(new MyError(Errors.TREASURY_DOES_NOT_HAVE_ENOUGH));
                } else {
                    res(null);
                }
            })
        })
    });

    it("should fail if business has not set crypto wallet", async () => {
        try {
            await liquidityManagerController.sendTokensToBusiness(environment_no_wallet, tokenType, amount, liquidityModelMock);
            expect(false).toBe(true);
        } catch (err) {
            if (err instanceof MyError) {
                if (err.message === Errors.BUSINESS_NOT_SET_WALLET) {
                    expect(true).toBe(true)
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

    it("should fail if business has not associated to account", async () => {
        try {
            await liquidityManagerController.sendTokensToBusiness(environment_not_associated, tokenType, amount, liquidityModelMock);
            expect(false).toBe(true);
        } catch (err) {
            if (err instanceof MyError) {
                if (err.message === Errors.BUSINESS_NOT_ASSOCIATED) {
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

    it("should fail if treasury does not have enough tokens", async () => {
        try {
            await liquidityManagerController.sendTokensToBusiness(environment_too_much, tokenType, amount, liquidityModelMock);
            expect(false).toBe(true);
        } catch (err) {
            if (err instanceof MyError) {
                if (err.message === Errors.TREASURY_DOES_NOT_HAVE_ENOUGH) {
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

    it("should send tokens", async () => {
        await liquidityManagerController.sendTokensToBusiness(good_environment, tokenType, amount, liquidityModelMock);
        expect(true).toBe(true);
    })
})