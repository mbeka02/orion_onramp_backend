import { TransactionController } from "../../src/controllers/transactions";
import { transactionModelMock } from "../mocks/transaction_model_mock";
import { TOKEN_TYPE } from "../../src/types/token";
import { TRANSACTION_STATUS } from "../../src/types/transactions";
import axios from "axios";
import { DrizzleQueryError } from "drizzle-orm/errors";
import { DatabaseError } from "pg";
import { businessModelMock } from "../mocks/business_model_mock";
import { ENVIRONMENT_TYPES } from "../../src/types/environments";

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
  const mockReference = `TXN_TEST_${mockEnvironmentID}_${mockOrderID}`;
  const mockTransactionId = "txn-uuid-123";
  const mockValidRequest = {
    amount: mockAmount,
    email: mockEmail,
    currency: "KES",
    metadata: { orderID: mockOrderID },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    transactionController = new TransactionController(
      transactionModelMock,
      businessModelMock,
    );

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
      ).toHaveBeenCalledWith(mockOrderID, mockEnvironmentID, mockToken);
      expect(transactionModelMock.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          reference: mockReference,
          metadata: { orderID: mockOrderID },
        }),
      );
    });
  });
  describe("Handling zombie transactions", () => {
    it("should repair zombie transaction (missing authorization URL)", async () => {
      const zombieTransaction = {
        id: mockTransactionId,
        reference: mockReference,
        amount: mockAmountMinor,
        email: mockEmail,
        authorizationUrl: null, // Missing URL
        accessCode: null,
        transactionStatus: TRANSACTION_STATUS.PENDING,
      };

      const pgError = new DatabaseError("duplicate key", 0, "error");
      pgError.code = "23505";
      const drizzleErr = new DrizzleQueryError("duplicate key", []);
      (drizzleErr as any).cause = pgError;

      transactionModelMock.createTransaction = jest
        .fn()
        .mockRejectedValue(drizzleErr);
      transactionModelMock.getTransactionByReference = jest
        .fn()
        .mockResolvedValue(zombieTransaction);

      const mockPaystackResponse = {
        status: true,
        message: "Authorization URL created",
        data: {
          authorization_url: "https://checkout.paystack.com/repaired",
          access_code: "repaired123",
          reference: mockReference,
        },
      };

      mockedAxios.post.mockResolvedValue({ data: mockPaystackResponse });
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
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });
    it("should throw error if zombie repair fails", async () => {
      const zombieTransaction = {
        id: mockTransactionId,
        reference: mockReference,
        authorizationUrl: null,
        accessCode: null,
      };

      const pgError = new DatabaseError("duplicate key", 0, "error");
      pgError.code = "23505";
      const drizzleErr = new DrizzleQueryError("duplicate key", []);
      (drizzleErr as any).cause = pgError;

      transactionModelMock.createTransaction = jest
        .fn()
        .mockRejectedValue(drizzleErr);
      transactionModelMock.getTransactionByReference = jest
        .fn()
        .mockResolvedValue(zombieTransaction);

      mockedAxios.post.mockRejectedValue(new Error("Paystack unavailable"));

      await expect(
        transactionController.initializeTransaction(
          mockValidRequest,
          mockEnvironmentID,
          mockToken,
        ),
      ).rejects.toThrow("Payment provider error");
    });
  });
  describe("Paystack API errors", () => {
    it("should handle Paystack API returning status=false", async () => {
      transactionModelMock.createTransaction = jest.fn().mockResolvedValue({
        id: mockTransactionId,
        reference: mockReference,
      });

      mockedAxios.post.mockResolvedValue({
        data: {
          status: false,
          message: "Invalid API key",
        },
      });

      await expect(
        transactionController.initializeTransaction(
          mockValidRequest,
          mockEnvironmentID,
          mockToken,
        ),
      ).rejects.toThrow("Payment provider error: Invalid API key");
    });

    it("should handle Axios network errors", async () => {
      transactionModelMock.createTransaction = jest.fn().mockResolvedValue({
        id: mockTransactionId,
        reference: mockReference,
      });

      const axiosError = {
        isAxiosError: true,
        response: {
          status: 500,
          data: { message: "Internal server error" },
        },
        message: "Network Error",
      };

      mockedAxios.post.mockRejectedValue(axiosError);
      //I've had to type casting for the mock otherwise typescript will complain
      (mockedAxios.isAxiosError as unknown as jest.Mock) = jest
        .fn()
        .mockReturnValue(true);
      await expect(
        transactionController.initializeTransaction(
          mockValidRequest,
          mockEnvironmentID,
          mockToken,
        ),
      ).rejects.toThrow("Payment provider error: Internal server error");
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
  describe("DB Error handling", () => {
    it("should handle non-duplicate database errors", async () => {
      const dbError = new DatabaseError("connection timeout", 0, "error");
      dbError.code = "57P01"; // Different error code
      const drizzleErr = new DrizzleQueryError("connection error", []);
      (drizzleErr as any).cause = dbError;

      transactionModelMock.createTransaction = jest
        .fn()
        .mockRejectedValue(drizzleErr);

      await expect(
        transactionController.initializeTransaction(
          mockValidRequest,
          mockEnvironmentID,
          mockToken,
        ),
      ).rejects.toThrow("Failed to create transaction");
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
    transactionController = new TransactionController(
      transactionModelMock,
      businessModelMock,
    );
  });
  it("should handle failed transaction from Paystack", async () => {
    transactionModelMock.getTransactionByReference = jest
      .fn()
      .mockResolvedValue({
        id: mockTransactionId,
        reference: mockReference,
        amount: mockAmount,
        email: mockEmail,
        transactionStatus: TRANSACTION_STATUS.PENDING,
      });

    mockedAxios.get.mockResolvedValue({
      data: {
        status: true,
        data: {
          status: "failed",
          reference: mockReference,
          amount: mockAmount,
          customer: { email: mockEmail },
        },
      },
    });

    transactionModelMock.updateTransactionStatus = jest
      .fn()
      .mockResolvedValue({});

    const result = await transactionController.verifyTransaction(mockReference);

    expect(result.status).toBe(TRANSACTION_STATUS.FAILED);
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
  describe("Business authorization", () => {
    it("should fetch transactions for authorized user", async () => {
      businessModelMock.checkUserBusinessMembership = jest
        .fn()
        .mockResolvedValue(true);
      transactionModelMock.getTransactionsByBusiness = jest
        .fn()
        .mockResolvedValue([]);

      await transactionController.getTransactionsByBusiness(
        "user-123",
        "biz-456",
        ENVIRONMENT_TYPES.TEST,
        1,
        10,
      );

      expect(businessModelMock.checkUserBusinessMembership).toHaveBeenCalled();
    });

    it("should reject unauthorized user", async () => {
      businessModelMock.checkUserBusinessMembership = jest
        .fn()
        .mockResolvedValue(false);

      await expect(
        transactionController.getTransactionsByBusiness(
          "user-123",
          "biz-456",
          ENVIRONMENT_TYPES.TEST,
          1,
          10,
        ),
      ).rejects.toThrow(
        "You do not have permission to view these payment details",
      );
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
