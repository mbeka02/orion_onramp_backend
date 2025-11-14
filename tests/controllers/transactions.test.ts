import { TransactionController } from "../../src/controllers/transactions";
import { transactionModelMock } from "../mocks/transaction_model_mock";
import { TOKEN_TYPE } from "../../src/types/token";
import { TRANSACTION_STATUS } from "../../src/types/transactions";
import axios from "axios";
import { DrizzleQueryError } from "drizzle-orm/errors";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;
beforeAll(() => {
  // deterministic reference generator
  jest
    .spyOn(TransactionController.prototype as any, "generateReference")
    .mockReturnValue("TXN_TEST_FIXREF");

  process.env.PAYSTACK_TEST_SECRET_KEY = "sk_test_xxx";
  process.env.PAYSTACK_LIVE_SECRET_KEY = "sk_live_xxx";
  process.env.NODE_ENV = "test";
});

describe("Transaction Controller: Initialize Transaction Tests", () => {
  let transactionController: TransactionController;

  const mockEnvironmentID = "env-123";
  const mockToken = TOKEN_TYPE.KESy_TESTNET;
  const mockEmail = "test@example.com";
  const mockAmount = 1000;
  const mockAmountMinor = 100000;
  const mockReference = "TXN_TEST_FIXREF";
  const mockTransactionId = "txn-uuid-123";

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    transactionController = new TransactionController(transactionModelMock);

    jest
      .spyOn(TransactionController.prototype as any, "generateReference")
      .mockReturnValue(mockReference);
  });

  describe("Successful initialization", () => {
    it("should successfully initialize a new transaction", async () => {
      transactionModelMock.createTransaction = jest.fn().mockResolvedValue({
        id: mockTransactionId,
        reference: mockReference,
        amount: mockAmountMinor,
        email: mockEmail,
        environmentID: mockEnvironmentID,
        token: mockToken,
        transactionStatus: TRANSACTION_STATUS.PENDING,
      });

      const mockPaystackResponse = {
        status: true,
        message: "Authorization URL created",
        data: {
          authorization_url: "https://checkout.paystack.com/abc123",
          access_code: "abc123",
          reference: mockReference,
        },
      };

      mockedAxios.post.mockResolvedValue({
        data: mockPaystackResponse,
      });

      transactionModelMock.updateTransactionWithPaystackResponse = jest
        .fn()
        .mockResolvedValue({});

      const result = await transactionController.initializeTransaction(
        {
          amount: mockAmount,
          email: mockEmail,
          currency: "KES",
        },
        mockEnvironmentID,
        mockToken,
      );

      expect(result).toEqual({
        reference: mockReference,
        authorization_url: mockPaystackResponse.data.authorization_url,
        access_code: mockPaystackResponse.data.access_code,
      });
    });
  });

  //
  // IDEMPOTENCY (UNIQUE CONSTRAINT)
  //
  // describe("Idempotency handling", () => {
  //   it("should return existing transaction on duplicate reference", async () => {
  //     const existingTransaction = {
  //       id: mockTransactionId,
  //       reference: mockReference,
  //       amount: mockAmountMinor,
  //       email: mockEmail,
  //       authorizationUrl: "https://checkout.paystack.com/existing123",
  //       accessCode: "existing123",
  //       transactionStatus: TRANSACTION_STATUS.PENDING,
  //     };
  //
  //     const pgError = {
  //       code: "23505",
  //       constraint: "transactions_reference_key",
  //     };
  //
  //     const drizzleErr = new DrizzleQueryError(
  //       'duplicate key value violates unique constraint "transactions_reference_key"',
  //       [],
  //     );
  //     (drizzleErr as any).cause = pgError;
  //
  //     transactionModelMock.createTransaction = jest
  //       .fn()
  //       .mockRejectedValue(drizzleErr);
  //
  //     transactionModelMock.getTransactionByReference = jest
  //       .fn()
  //       .mockResolvedValue(existingTransaction);
  //
  //     const result = await transactionController.initializeTransaction(
  //       { amount: mockAmount, email: mockEmail },
  //       mockEnvironmentID,
  //       mockToken,
  //     );
  //
  //     expect(result).toEqual({
  //       reference: mockReference,
  //       authorization_url: existingTransaction.authorizationUrl,
  //       access_code: existingTransaction.accessCode,
  //       message: "Payment already initialized",
  //     });
  //   });
  // });

  describe("Validation", () => {
    it("should throw error if amount exceeds maximum", async () => {
      await expect(
        transactionController.initializeTransaction(
          { amount: 600000, email: mockEmail },
          mockEnvironmentID,
          mockToken,
        ),
      ).rejects.toThrow("Amount exceeds maximum transaction limit");
    });
  });
});

describe("Transaction Controller: Verify Transaction Tests", () => {
  let transactionController: TransactionController;

  const mockReference = "TXN_TEST_FIXREF";
  const mockTransactionId = "txn-uuid-123";
  const mockEmail = "test@example.com";
  const mockAmount = 100000;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    transactionController = new TransactionController(transactionModelMock);

    jest
      .spyOn(TransactionController.prototype as any, "generateReference")
      .mockReturnValue(mockReference);
  });

  describe("Already processed", () => {
    it("returns SUCCESSFUL from DB", async () => {
      transactionModelMock.getTransactionByReference = jest
        .fn()
        .mockResolvedValue({
          id: mockTransactionId,
          reference: mockReference,
          amount: mockAmount,
          email: mockEmail,
          transactionStatus: TRANSACTION_STATUS.SUCCESSFUL,
        });

      const result =
        await transactionController.verifyTransaction(mockReference);

      expect(result).toEqual({
        reference: mockReference,
        status: TRANSACTION_STATUS.SUCCESSFUL,
        amount: mockAmount,
        email: mockEmail,
      });
    });
  });
  describe("Pending fallback", () => {
    it("verifies with Paystack if pending", async () => {
      transactionModelMock.getTransactionByReference = jest
        .fn()
        .mockResolvedValue({
          id: mockTransactionId,
          reference: mockReference,
          amount: mockAmount,
          email: mockEmail,
          transactionStatus: TRANSACTION_STATUS.PENDING,
        });

      const paystackVerifyResponse = {
        status: true,
        message: "OK",
        data: {
          status: "success",
          reference: mockReference,
          amount: mockAmount,
          customer: { email: mockEmail },
        },
      };

      mockedAxios.get.mockResolvedValue({
        data: paystackVerifyResponse,
      });

      transactionModelMock.updateTransactionStatus = jest
        .fn()
        .mockResolvedValue({});

      const result =
        await transactionController.verifyTransaction(mockReference);

      expect(result).toEqual({
        reference: mockReference,
        status: TRANSACTION_STATUS.SUCCESSFUL,
        amount: mockAmount,
        email: mockEmail,
      });
    });
  });

  describe("Missing transaction", () => {
    it("throws error if not found", async () => {
      transactionModelMock.getTransactionByReference = jest
        .fn()
        .mockResolvedValue(null);

      await expect(
        transactionController.verifyTransaction(mockReference),
      ).rejects.toThrow(`Transaction not found: ${mockReference}`);
    });
  });
});
