import { LiquidityManagerModel } from "../../src/models/liquidityManager";

export const liquidityModelMock = {
    getCachedTreasuryTokenBalance: jest.fn(),
    getTreasuryBalanceFromOnchain: jest.fn(),
    deductCachedTreasuryBalance: jest.fn()
} as LiquidityManagerModel