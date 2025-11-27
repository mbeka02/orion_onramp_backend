import { LiquidityManagerModel } from "../../src/models/liquidityManager";

export const liquidityModelMock = {
  getCachedTreasuryTokenBalance: jest.fn(),
  getTreasuryBalanceFromOnchain: jest.fn(),
  deductCachedTreasuryBalance: jest.fn(),
  transferToBusiness: jest.fn(),
  getTransactionDetailsForBusinessTransfer: jest.fn(),
  sendTokensToAccount: jest.fn(),
  undoTreasuryCachedBalanceDeduct: jest.fn(),
} as LiquidityManagerModel;
