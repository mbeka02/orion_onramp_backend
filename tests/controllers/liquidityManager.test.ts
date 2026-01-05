import liquidityManagerController from "../../src/controllers/liquidityManager";
import { Errors, MyError } from "../../src/errors";
import { TOKEN_TYPE } from "../../src/types/token";
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
    liquidityModelMock.getCachedTreasuryTokenBalance = jest
      .fn()
      .mockImplementation((token_type) => {
        return new Promise((res, rej) => {
          if (token_type === token) {
            res(enough);
          } else if (token_type === otherToken) {
            res(otherBalance);
          } else {
            res(0);
          }
        });
      });
  });

  it("should return false if treasury does not have balance", async () => {
    const isEnough = await liquidityManagerController.doesTreasuryHaveBalance(
      token,
      tooMuch,
      liquidityModelMock,
      emailServiceMock,
    );
    expect(isEnough).toBe(false);
    expect(
      liquidityModelMock.deductCachedTreasuryBalance,
    ).toHaveBeenCalledTimes(0);
  });

  it("should return true if treasury has balance and deduct from cache", async () => {
    const isEnough = await liquidityManagerController.doesTreasuryHaveBalance(
      token,
      safeBalanceCheck,
      liquidityModelMock,
      emailServiceMock,
    );

    expect(isEnough).toBe(true);
    expect(liquidityModelMock.deductCachedTreasuryBalance).toHaveBeenCalledWith(
      token,
      safeBalanceCheck,
    );
  });

  it("should contact someone if balance is below threshold", async () => {
    const isEnough = await liquidityManagerController.doesTreasuryHaveBalance(
      otherToken,
      safeBalanceCheck,
      liquidityModelMock,
      emailServiceMock,
    );

    expect(isEnough).toBe(true);
    expect(liquidityModelMock.deductCachedTreasuryBalance).toHaveBeenCalledWith(
      otherToken,
      safeBalanceCheck,
    );
    expect(emailServiceMock.topUpTreasury).toHaveBeenCalledWith(
      otherToken,
      undefined,
    );
  });
});

describe("Liquidity Manager Tests: Send Tokens To Business", () => {
  const environment_no_wallet = "not set wallet"
  const environment_not_associated = "not associated";
  const environment_too_much = "amount is too big";
  const good_environment = "good";
  const notAssociatedAccount = "not associated";
  const tooMuchAccount = "too much";
  const goodAccount = "good";
  const treasuryAccount = "treasury";
  const token = "token";
  const amount = 10;
  const amountWithDecimals = amount * Math.pow(10, 2);
  const tokenType = TOKEN_TYPE.KESy_TESTNET;

  beforeAll(async () => {
    liquidityModelMock.getTransactionDetailsForBusinessTransfer = jest
      .fn()
      .mockImplementation((environment_id, token_type, amount) => {
        return new Promise((res, rej) => {
          if (environment_id === environment_no_wallet) {
            res({
              token_type: tokenType,
              treasury_account: treasuryAccount,
              token_address: token,
              business_crypto_account: null,
              amount_with_decimals: amountWithDecimals,
            });
          } else if (environment_id === environment_not_associated) {
            res({
              token_type: tokenType,
              treasury_account: treasuryAccount,
              token_address: token,
              business_crypto_account: notAssociatedAccount,
              amount_with_decimals: amountWithDecimals,
            });
          } else if (environment_id === environment_too_much) {
            res({
              token_type: tokenType,
              treasury_account: treasuryAccount,
              token_address: token,
              business_crypto_account: tooMuchAccount,
              amount_with_decimals: amountWithDecimals,
            });
          } else if (environment_id === good_environment) {
            res({
              token_type: tokenType,
              treasury_account: treasuryAccount,
              token_address: token,
              business_crypto_account: goodAccount,
              amount_with_decimals: amountWithDecimals,
            });
          }
        });
      });

    liquidityModelMock.sendTokensToAccount = jest
      .fn()
      .mockImplementation((details) => {
        return new Promise((res, rej) => {
          if (details.business_crypto_account === notAssociatedAccount) {
            rej(new MyError(Errors.BUSINESS_NOT_ASSOCIATED));
          } else if (details.business_crypto_account === tooMuchAccount) {
            rej(new MyError(Errors.TREASURY_DOES_NOT_HAVE_ENOUGH));
          } else {
            res(null);
          }
        });
      });
  });

  it("should fail if business has not associated to account", async () => {
    try {
      await liquidityManagerController.sendTokensToBusiness(
        environment_not_associated,
        tokenType,
        amount,
        liquidityModelMock,
        null,
      );
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

  it("should fail if business has not set account and not given wallet to onramp to", async () => {
    try {
      await liquidityManagerController.sendTokensToBusiness(
        environment_no_wallet,
        tokenType,
        amount,
        liquidityModelMock,
        null,
      );
      expect(false).toBe(true);
    } catch (err) {
      if (err instanceof MyError) {
        if (err.message === Errors.BUSINESS_NOT_SET_WALLET) {
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
      await liquidityManagerController.sendTokensToBusiness(
        environment_too_much,
        tokenType,
        amount,
        liquidityModelMock,
        null,
      );
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
    await liquidityManagerController.sendTokensToBusiness(
      good_environment,
      tokenType,
      amount,
      liquidityModelMock,
      null,
    );
    expect(liquidityModelMock.sendTokensToAccount).toHaveBeenCalledWith({
      token_type: tokenType,
      treasury_account: treasuryAccount,
      token_address: token,
      business_crypto_account: goodAccount,
      amount_with_decimals: amountWithDecimals,
    });
  });

  it("should send tokens to account provided", async () => {
    const account = "some account";
    await liquidityManagerController.sendTokensToBusiness(
      good_environment,
      tokenType,
      amount,
      liquidityModelMock,
      account,
    );
    expect(liquidityModelMock.sendTokensToAccount).toHaveBeenCalledWith({
      token_type: tokenType,
      treasury_account: treasuryAccount,
      token_address: token,
      business_crypto_account: account,
      amount_with_decimals: amountWithDecimals,
    });
  });
});

describe("Liquidity Manager Tests: Undo Cache Deduct", () => {
  const token = TOKEN_TYPE.KESy_TESTNET;
  const goodAmount = 100;
  const badAmount = 10000;
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  beforeAll(async () => {
    liquidityModelMock.undoTreasuryCachedBalanceDeduct = jest
      .fn()
      .mockImplementation((token, amount) => {
        return new Promise((res, rej) => {
          if (token == TOKEN_TYPE.KESy_TESTNET && amount === badAmount) {
            rej("Some error");
          } else {
            res(null);
          }
        });
      });
  });

  it("should call cache deduct once if no errors occur", async () => {
    await liquidityManagerController.undoCacheDeduct(
      token,
      goodAmount,
      liquidityModelMock,
    );
    expect(
      liquidityModelMock.undoTreasuryCachedBalanceDeduct,
    ).toHaveBeenCalledTimes(1);
    expect(
      liquidityModelMock.undoTreasuryCachedBalanceDeduct,
    ).toHaveBeenCalledWith(token, goodAmount);
  });

  it("should try calling 5 times if errors occur", async () => {
    try {
      await liquidityManagerController.undoCacheDeduct(
        token,
        badAmount,
        liquidityModelMock,
        1,
        0,
      );
      expect(false).toBe(true);
    } catch (err) {
      expect(
        liquidityModelMock.undoTreasuryCachedBalanceDeduct,
      ).toHaveBeenCalledTimes(5);
      expect(
        liquidityModelMock.undoTreasuryCachedBalanceDeduct,
      ).toHaveBeenCalledWith(token, badAmount);
    }
  });
});

describe("Liquidity Manager Tests: Mark Transaction Onramped", () => {
  const goodTransactionReference = "good reference";
  const badTransactionReference = "bad reference";

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  beforeAll(async () => {
    liquidityModelMock.markTransactionAsOnramped = jest
      .fn()
      .mockImplementation((ref) => {
        return new Promise((res, rej) => {
          if (ref === goodTransactionReference) {
            res(null);
          } else if (ref === badTransactionReference) {
            rej("Some error");
          } else {
            rej("Unexpected input");
          }
        });
      });
  });

  it("should call mark transaction onramped once if no error", async () => {
    await liquidityManagerController.markTransactionOnramped(
      goodTransactionReference,
      liquidityModelMock,
    );
    expect(liquidityModelMock.markTransactionAsOnramped).toHaveBeenCalledTimes(
      1,
    );
    expect(liquidityModelMock.markTransactionAsOnramped).toHaveBeenCalledWith(
      goodTransactionReference,
    );
  });

  it("should call mark transaction onramped 5 times if errors happen", async () => {
    try {
      await liquidityManagerController.markTransactionOnramped(
        badTransactionReference,
        liquidityModelMock,
        1,
        0,
      );
      expect(false).toBe(true);
    } catch (err) {
      expect(
        liquidityModelMock.markTransactionAsOnramped,
      ).toHaveBeenCalledTimes(5);
      expect(liquidityModelMock.markTransactionAsOnramped).toHaveBeenCalledWith(
        badTransactionReference,
      );
    }
  });
});

describe("Liquidity Manager Controller: Mark Transaction Failed", () => {
  const goodTransactionReference = "good reference";
  const badTransactionReference = "bad reference";

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  beforeAll(async () => {
    liquidityModelMock.markTransactionAsFailed = jest
      .fn()
      .mockImplementation((ref) => {
        return new Promise((res, rej) => {
          if (ref === goodTransactionReference) {
            res(null);
          } else if (ref === badTransactionReference) {
            rej("Some error");
          } else {
            rej("Unexpected input");
          }
        });
      });
  });

  it("should call mark transaction failed once if no error", async () => {
    await liquidityManagerController.markTransactionFailed(
      goodTransactionReference,
      liquidityModelMock,
    );
    expect(liquidityModelMock.markTransactionAsFailed).toHaveBeenCalledTimes(1);
    expect(liquidityModelMock.markTransactionAsFailed).toHaveBeenCalledWith(
      goodTransactionReference,
    );
  });

  it("should call mark transaction failed 5 times if errors happen", async () => {
    try {
      await liquidityManagerController.markTransactionFailed(
        badTransactionReference,
        liquidityModelMock,
        1,
        0,
      );
      expect(false).toBe(true);
    } catch (err) {
      expect(liquidityModelMock.markTransactionAsFailed).toHaveBeenCalledTimes(
        5,
      );
      expect(liquidityModelMock.markTransactionAsFailed).toHaveBeenCalledWith(
        badTransactionReference,
      );
    }
  });
});
