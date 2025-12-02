import crypto from "crypto";
import { TransactionController } from "../../src/controllers/transactions";
import { transactionModelMock } from "../mocks/transaction_model_mock";
import { TRANSACTION_STATUS } from "../../src/types/transactions";
import businessModelMock from "../mocks/business_model_mock";

beforeAll(() => {
  jest.clearAllMocks();
  process.env.PAYSTACK_TEST_SECRET_KEY = "sk_test_xxx";
  process.env.PAYSTACK_LIVE_SECRET_KEY = "sk_live_xxx";
  process.env.NODE_ENV = "test";
});

describe("TransactionController - Webhook utilities", () => {
  let controller: TransactionController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new TransactionController(transactionModelMock as any, businessModelMock);
  });

  describe("isSignatureValid", () => {
    it("returns true for a valid HMAC signature", () => {
      const body = JSON.stringify({ hello: "world" });
      // The controller picks the test secret when NODE_ENV !== production
      const secret = process.env.PAYSTACK_TEST_SECRET_KEY as string;
      const signature = crypto
        .createHmac("sha512", secret)
        .update(body, "utf8")
        .digest("hex");

      const valid = (controller as any).isSignatureValid(body, signature);
      expect(valid).toBe(true);
    });

    it("returns false for an invalid signature", () => {
      const body = JSON.stringify({ hello: "world" });
      const badSignature = "deadbeef";

      const valid = (controller as any).isSignatureValid(body, badSignature);
      expect(valid).toBe(false);
    });
  });

  describe("handlePaystackWebhook", () => {
    it("calls processChargeSuccess on charge.success event", async () => {
      const data = { reference: "TXN_123" } as any;

      const spySuccess = jest
        .spyOn(controller as any, "processChargeSuccess")
        .mockResolvedValue(undefined);
      const spyFailed = jest
        .spyOn(controller as any, "processChargeFailed")
        .mockResolvedValue(undefined);

      await (controller as any).handlePaystackWebhook("charge.success", data);

      expect(spySuccess).toHaveBeenCalledWith(data);
      expect(spyFailed).not.toHaveBeenCalled();
    });

    it("calls processChargeFailed on charge.failed event", async () => {
      const data = { reference: "TXN_456" } as any;

      const spySuccess = jest
        .spyOn(controller as any, "processChargeSuccess")
        .mockResolvedValue(undefined);
      const spyFailed = jest
        .spyOn(controller as any, "processChargeFailed")
        .mockResolvedValue(undefined);

      await (controller as any).handlePaystackWebhook("charge.failed", data);

      expect(spyFailed).toHaveBeenCalledWith(data);
      expect(spySuccess).not.toHaveBeenCalled();
    });
  });

  describe("processChargeSuccess", () => {
    it("updates transaction status to SUCCESSFUL when pending", async () => {
      const reference = "TXN_OK_1";
      const data = { reference, some: "payload" } as any;

      transactionModelMock.getTransactionByReference = jest
        .fn()
        .mockResolvedValue({
          reference,
          transactionStatus: TRANSACTION_STATUS.PENDING,
        });

      transactionModelMock.updateTransactionStatus = jest
        .fn()
        .mockResolvedValue({});

      await (controller as any).processChargeSuccess(data);

      expect(
        transactionModelMock.getTransactionByReference,
      ).toHaveBeenCalledWith(reference);

      expect(transactionModelMock.updateTransactionStatus).toHaveBeenCalledWith(
        reference,
        TRANSACTION_STATUS.SUCCESSFUL,
        data,
      );
    });

    it("does not call update when transaction not found", async () => {
      const reference = "TXN_NOT_FOUND";
      const data = { reference } as any;

      transactionModelMock.getTransactionByReference = jest
        .fn()
        .mockResolvedValue(null);
      transactionModelMock.updateTransactionStatus = jest.fn();

      await (controller as any).processChargeSuccess(data);

      expect(
        transactionModelMock.updateTransactionStatus,
      ).not.toHaveBeenCalled();
    });

    it("does not call update when already successful", async () => {
      const reference = "TXN_ALREADY_OK";
      const data = { reference } as any;

      transactionModelMock.getTransactionByReference = jest
        .fn()
        .mockResolvedValue({
          reference,
          transactionStatus: TRANSACTION_STATUS.SUCCESSFUL,
        });
      transactionModelMock.updateTransactionStatus = jest.fn();

      await (controller as any).processChargeSuccess(data);

      expect(
        transactionModelMock.updateTransactionStatus,
      ).not.toHaveBeenCalled();
    });
  });

  describe("processChargeFailed", () => {
    it("updates transaction status to FAILED when pending", async () => {
      const reference = "TXN_FAIL_1";
      const data = { reference, reason: "card_declined" } as any;

      transactionModelMock.getTransactionByReference = jest
        .fn()
        .mockResolvedValue({
          reference,
          transactionStatus: TRANSACTION_STATUS.PENDING,
        });

      transactionModelMock.updateTransactionStatus = jest
        .fn()
        .mockResolvedValue({});

      await (controller as any).processChargeFailed(data);

      expect(
        transactionModelMock.getTransactionByReference,
      ).toHaveBeenCalledWith(reference);

      expect(transactionModelMock.updateTransactionStatus).toHaveBeenCalledWith(
        reference,
        TRANSACTION_STATUS.FAILED,
        data,
      );
    });

    it("does not call update when transaction not found", async () => {
      const reference = "TXN_FAIL_NOTFOUND";
      const data = { reference } as any;

      transactionModelMock.getTransactionByReference = jest
        .fn()
        .mockResolvedValue(null);
      transactionModelMock.updateTransactionStatus = jest.fn();

      await (controller as any).processChargeFailed(data);

      expect(
        transactionModelMock.updateTransactionStatus,
      ).not.toHaveBeenCalled();
    });

    it("does not call update when already failed", async () => {
      const reference = "TXN_FAIL_ALREADY";
      const data = { reference } as any;

      transactionModelMock.getTransactionByReference = jest
        .fn()
        .mockResolvedValue({
          reference,
          transactionStatus: TRANSACTION_STATUS.FAILED,
        });

      transactionModelMock.updateTransactionStatus = jest.fn();

      await (controller as any).processChargeFailed(data);

      expect(
        transactionModelMock.updateTransactionStatus,
      ).not.toHaveBeenCalled();
    });
  });
});
