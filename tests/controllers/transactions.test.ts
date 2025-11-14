import { TransactionController } from "../../src/controllers/transactions";
import { transactionModelMock } from "../mocks/transaction_model_mock";
import { TOKEN_TYPE } from "../../src/types/token";
import { TRANSACTION_STATUS } from "../../src/types/transactions";
import axios from "axios";
import { DrizzleQueryError } from "drizzle-orm/errors";
import { DatabaseError } from "pg";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

beforeAll(() => {
  jest.clearAllMocks();
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
  const mockOrderID = "ord-12345-abc";
  const mockReference = `TXN_TEST_${mockOrderID}`;
  const mockTransactionId = "txn-uuid-123";
  const mockValidRequest = {
    amount: mockAmount,
    email: mockEmail,
    currency: "KES",
    metadata: { orderID: mockOrderID },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    transactionController = new TransactionController(transactionModelMock);

    jest
      .spyOn(TransactionController.prototype as any, "generateReference")
      .mockReturnValue(mockReference);
  });
afterEach(() => {
    jest.restoreAllMocks();
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
        mockValidRequest,
        mockEnvironmentID,
        mockToken,
      );

      expect(result).toEqual({
        reference: mockReference,
        authorization_url: mockPaystackResponse.data.authorization_url,
        access_code: mockPaystackResponse.data.access_code,
      });

      expect(
        (TransactionController.prototype as any).generateReference,
      ).toHaveBeenCalledWith(mockOrderID, mockToken);
      expect(transactionModelMock.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          reference: mockReference,
          metadata: { orderID: mockOrderID },
        }),
      );
    });
  });

  describe("Idempotency handling", () => {
    it("should return existing transaction on duplicate reference", async () => {
      const existingTransaction = {
        id: mockTransactionId,
        reference: mockReference,
        amount: mockAmountMinor,
        email: mockEmail,
        authorizationUrl: "https://checkout.paystack.com/existing123",
        accessCode: "existing123",
        transactionStatus: TRANSACTION_STATUS.PENDING,
      };

      const pgError = new DatabaseError("duplicate key", 0, "error");
      pgError.code = "23505";
      pgError.constraint = "transactions_reference_key";

      const drizzleErr = new DrizzleQueryError(
        'duplicate key value violates unique constraint "transactions_reference_key"',
        [],
      );
      (drizzleErr as any).cause = pgError;

      transactionModelMock.createTransaction = jest
        .fn()
        .mockRejectedValue(drizzleErr);

      transactionModelMock.getTransactionByReference = jest
        .fn()
        .mockResolvedValue(existingTransaction);

      const result = await transactionController.initializeTransaction(
        mockValidRequest,
        mockEnvironmentID,
        mockToken,
      );

      expect(result).toEqual({
        reference: mockReference,
        authorization_url: existingTransaction.authorizationUrl,
        access_code: existingTransaction.accessCode,
        message: "Payment already initialized",
      });

      expect(mockedAxios.post).not.toHaveBeenCalled();
      expect(
        transactionModelMock.updateTransactionWithPaystackResponse,
      ).not.toHaveBeenCalled();
    });
  });

  describe("Validation", () => {
    it("should throw error if amount exceeds maximum", async () => {
      const highAmountRequest = {
        amount: 600000,
        email: mockEmail,
        metadata: { orderID: "mbeka_is_awesome" },
      };

      await expect(
        transactionController.initializeTransaction(
          highAmountRequest,
          mockEnvironmentID,
          mockToken,
        ),
      ).rejects.toThrow("Amount exceeds maximum transaction limit");
    });

    it("should throw error if metadata.orderID is missing", async () => {
      const invalidRequest = {
        amount: mockAmount,
        email: mockEmail,
        metadata: { notAnOrderID: "roman_sucks" },
      };

      await expect(
        transactionController.initializeTransaction(
          invalidRequest as any, // Casting to any to bypass TS types
          mockEnvironmentID,
          mockToken,
        ),
      ).rejects.toThrow("Missing or invalid 'orderID' in metadata");
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
    transactionController = new TransactionController(transactionModelMock);
  });
afterEach(() => {
    jest.restoreAllMocks();
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
