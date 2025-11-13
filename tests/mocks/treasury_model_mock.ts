import { TreasuryModel } from "../../src/models/treasury";

export const treasuryModelMock = {
    doesTransactionExist: jest.fn(),
    hasTransactionAlreadyBeenOnramped: jest.fn()
} as TreasuryModel