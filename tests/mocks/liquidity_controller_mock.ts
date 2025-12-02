import { LiquidityManagerController } from "../../src/controllers/liquidityManager";

export const liquidityManagerControllerMock = {
  doesTreasuryHaveBalance: jest.fn(),
  getMoreTokens: jest.fn(),
  sendTokensToBusiness: jest.fn(),
  undoCacheDeduct: jest.fn(),
  markTransactionOnramped: jest.fn(),
  markTransactionFailed: jest.fn()
} as LiquidityManagerController;
