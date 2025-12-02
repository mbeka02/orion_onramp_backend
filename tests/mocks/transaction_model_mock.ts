import { TransactionModel } from "../../src/models/transactions";

export const transactionModelMock = {
  createTransaction: jest.fn(),
  updateTransactionWithPaystackResponse: jest.fn(),
  updateTransactionStatus: jest.fn(),
  getTransactionByReference: jest.fn(),
  getTransactionsByBusiness: jest.fn(),
  getTransactionById: jest.fn(),
  getTransactionBusinessId: jest.fn(),
  getWebhookControllerTransactionDetails: jest.fn(),
} as TransactionModel;
