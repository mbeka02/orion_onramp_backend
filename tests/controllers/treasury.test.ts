import treasuryController from "../../src/controllers/treasury";
import { Errors, MyError } from "../../src/errors";
import { TOKEN_TYPE } from "../../src/types/token";
import { TRANSACTION_STATUS } from "../../src/types/transactions";
import { emailServiceMock } from "../mocks/email_service_mock";
import { liquidityManagerControllerMock } from "../mocks/liquidity_controller_mock";
import { liquidityModelMock } from "../mocks/liquidity_model_mock";
import { transactionModelMock } from "../mocks/transaction_model_mock";
import { treasuryModelMock } from "../mocks/treasury_model_mock";

describe("Treasury Business SDK Onramp Tests", () => {
  const existing_transaction_reference = "existing";
  const non_existing_transaction_reference = "not existing";
  const onramped_transaction_reference = "onramped transaction";
  const not_complete_transaction_reference = "not_complete_transaction";
  const too_much_transaction_reference = "too_much_transaction";
  const too_much_amount = 1000000;
  const testToken = TOKEN_TYPE.KESy_TESTNET;
  const too_much_transaction_id = "too_much_id";
  const too_much_transaction = {
    id: too_much_transaction_id,
    environmentID: "too_much",
    reference: "too_much",
    token: testToken,
    amount: too_much_amount * 100,
    email: "too_much",
    transactionStatus: TRANSACTION_STATUS.SUCCESSFUL,
  };
  const enough_transaction_reference = "enough transaction";
  const enough_transaction_id = "enough_transaction";
  const enough_amount = 10;
  const enough_transaction = {
    id: enough_transaction_id,
    environmentID: "enough",
    reference: "enough",
    token: testToken,
    amount: enough_amount * 100,
    email: "enough",
    transactionStatus: TRANSACTION_STATUS.SUCCESSFUL,
  };
  const failing_transaction_reference = "failing transaction";
  const failing_transaction_id = "failing_transaction";
  const failingEnvironment = "failing";
  const failing_transaction = {
    id: failing_transaction_id,
    environmentID: failingEnvironment,
    reference: "enough",
    token: testToken,
    amount: enough_amount * 100,
    email: "enough",
    transactionStatus: TRANSACTION_STATUS.SUCCESSFUL,
  };

  beforeAll(async () => {
    treasuryModelMock.doesTransactionExist = jest
      .fn()
      .mockImplementation((transaction_id: string) => {
        return new Promise((res, rej) => {
          if (
            transaction_id === existing_transaction_reference ||
            transaction_id === onramped_transaction_reference ||
            transaction_id === not_complete_transaction_reference ||
            transaction_id === too_much_transaction_reference ||
            transaction_id === enough_transaction_reference ||
            transaction_id === failing_transaction_reference
          ) {
            res(true);
          } else {
            res(false);
          }
        });
      });

    treasuryModelMock.hasTransactionAlreadyBeenOnramped = jest
      .fn()
      .mockImplementation((transaction_id: string) => {
        return new Promise((res, rej) => {
          if (transaction_id === onramped_transaction_reference) {
            res(true);
          } else {
            res(false);
          }
        });
      });

    treasuryModelMock.isFiatPaymentCompleted = jest
      .fn()
      .mockImplementation((transaction_id: string) => {
        return new Promise((res, rej) => {
          if (
            transaction_id === existing_transaction_reference ||
            transaction_id === onramped_transaction_reference ||
            transaction_id === too_much_transaction_reference ||
            transaction_id === enough_transaction_reference ||
            transaction_id === failing_transaction_reference
          ) {
            res(true);
          } else {
            res(false);
          }
        });
      });

    liquidityManagerControllerMock.doesTreasuryHaveBalance = jest
      .fn()
      .mockImplementation((token, amount, liquidityModel) => {
        return new Promise((res, rej) => {
          if (token === testToken && amount >= too_much_amount) {
            res(false);
          } else {
            res(true);
          }
        });
      });

    transactionModelMock.getTransactionByReference = jest
      .fn()
      .mockImplementation((id) => {
        return new Promise((res, rej) => {
          if (id === too_much_transaction_reference) {
            res(too_much_transaction);
          } else if (id === enough_transaction_reference) {
            res(enough_transaction);
          } else if (id === failing_transaction_reference) {
            res(failing_transaction);
          } else {
            rej(new Error("Unexpected transaction id"));
          }
        });
      });

    liquidityManagerControllerMock.getMoreTokens = jest
      .fn()
      .mockImplementation((token, amount) => {
        return new Promise((res, rej) => {
          res(null);
        });
      });

    liquidityManagerControllerMock.sendTokensToBusiness = jest
      .fn()
      .mockImplementation(
        (environment_id, token_type, amount, liquidityModel) => {
          return new Promise((res, rej) => {
            if (environment_id === failingEnvironment) {
              rej(new Error("Could not send"));
            } else {
              res(null);
            }
          });
        },
      );

    liquidityManagerControllerMock.markTransactionOnramped = jest
      .fn()
      .mockImplementation((reference) => {
        return new Promise((res, rej) => {
          if (reference === enough_transaction_reference) {
            res(null);
          } else {
            rej("Unexpected transaction reference");
          }
        });
      });
  });

  it("should fail if transaction reference doesn't exist", async () => {
    try {
      await treasuryController.businessOnramp(
        non_existing_transaction_reference,
        treasuryModelMock,
        liquidityManagerControllerMock,
        transactionModelMock,
        liquidityModelMock,
        emailServiceMock,
      );
      expect(false).toBe(true);
    } catch (err) {
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
      await treasuryController.businessOnramp(
        onramped_transaction_reference,
        treasuryModelMock,
        liquidityManagerControllerMock,
        transactionModelMock,
        liquidityModelMock,
        emailServiceMock,
      );
      expect(false).toBe(true);
    } catch (err) {
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

  it("should fail if transaction exists but the fiat payment was not successful", async () => {
    try {
      await treasuryController.businessOnramp(
        not_complete_transaction_reference,
        treasuryModelMock,
        liquidityManagerControllerMock,
        transactionModelMock,
        liquidityModelMock,
        emailServiceMock,
      );
      expect(false).toBe(true);
    } catch (err) {
      if (err instanceof MyError) {
        if (err.message === Errors.PAYMENT_NOT_COMPLETE) {
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

  it("should error out and contact liquidity manager if the amount is more than in treasury", async () => {
    try {
      await treasuryController.businessOnramp(
        too_much_transaction_reference,
        treasuryModelMock,
        liquidityManagerControllerMock,
        transactionModelMock,
        liquidityModelMock,
        emailServiceMock,
      );
      expect(true).toBe(false);
    } catch (err) {
      if (err instanceof MyError) {
        if (err.message === Errors.TREASURY_DOES_NOT_HAVE_ENOUGH) {
          expect(true).toBe(true);
          expect(
            liquidityManagerControllerMock.doesTreasuryHaveBalance,
          ).toHaveBeenCalledWith(
            testToken,
            too_much_amount,
            liquidityModelMock,
            emailServiceMock,
          );
          expect(
            liquidityManagerControllerMock.getMoreTokens,
          ).toHaveBeenCalledWith(testToken, emailServiceMock, too_much_amount);
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

  it("should send tokens to the DApp", async () => {
    try {
      await treasuryController.businessOnramp(
        enough_transaction_reference,
        treasuryModelMock,
        liquidityManagerControllerMock,
        transactionModelMock,
        liquidityModelMock,
        emailServiceMock,
      );
      expect(
        liquidityManagerControllerMock.sendTokensToBusiness,
      ).toHaveBeenCalledWith(
        enough_transaction.environmentID,
        enough_transaction.token,
        enough_transaction.amount / 100,
        liquidityModelMock,
      );
      expect(
        liquidityManagerControllerMock.markTransactionOnramped,
      ).toHaveBeenCalledWith(enough_transaction_reference, liquidityModelMock);
    } catch (err) {
      console.error("Unexpected error", err);
      expect(false).toBe(true);
    }
  });

  it("should undo treasury cache deduct if something failed but had enough balance", async () => {
    try {
      await treasuryController.businessOnramp(
        failing_transaction_reference,
        treasuryModelMock,
        liquidityManagerControllerMock,
        transactionModelMock,
        liquidityModelMock,
        emailServiceMock,
      );
      expect(false).toBe(true);
    } catch (err) {
      expect(
        liquidityManagerControllerMock.undoCacheDeduct,
      ).toHaveBeenCalledWith(
        failing_transaction.token,
        failing_transaction.amount / 100,
        liquidityModelMock,
      );
    }
  });
});
