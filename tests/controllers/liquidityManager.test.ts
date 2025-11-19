import liquidityManagerController from "../../src/controllers/liquidityManager";
import { TOKEN_TYPE } from "../../src/types/token"
import { emailServiceMock } from "../mocks/email_service_mock";
import { liquidityModelMock } from "../mocks/liquidity_model_mock";

describe("Liquidity Managers Tests: Treasury Balance checker", () => {
    const token = TOKEN_TYPE.KESy_MAINNET;
    const tooMuch = 100000000;
    const enough = 1000000;
    const safeBalanceCheck = 10;
    const otherToken = TOKEN_TYPE.KESy_TESTNET;
    const otherBalance = 299999;

    beforeAll(async () => {
        liquidityModelMock.getCachedTreasuryTokenBalance = jest.fn().mockImplementation((token_type) => {
            return new Promise((res, rej) => {
                if (token_type === token) {
                    res(enough);
                } else if (token_type === otherToken) {
                    res(otherBalance);
                } else {
                    res(0);
                }
            })
        });
    })

    it("should return false if treasury does not have balance", async () => {
        const isEnough = await liquidityManagerController.doesTreasuryHaveBalance(token, tooMuch, liquidityModelMock, emailServiceMock);
        expect(isEnough).toBe(false);
        expect(liquidityModelMock.deductCachedTreasuryBalance).toHaveBeenCalledTimes(0);
    });

    it("should return true if treasury has balance and deduct from cache", async () => {
        const isEnough = await liquidityManagerController.doesTreasuryHaveBalance(token, safeBalanceCheck, liquidityModelMock, emailServiceMock);

        expect(isEnough).toBe(true);
        expect(liquidityModelMock.deductCachedTreasuryBalance).toHaveBeenCalledWith(token, safeBalanceCheck);
    });

    it("should contact someone if balance is below threshold", async () => {
        const isEnough = await liquidityManagerController.doesTreasuryHaveBalance(otherToken, safeBalanceCheck, liquidityModelMock, emailServiceMock);

        expect(isEnough).toBe(true);
        expect(liquidityModelMock.deductCachedTreasuryBalance).toHaveBeenCalledWith(otherToken, safeBalanceCheck);
        expect(emailServiceMock.topUpTreasury).toHaveBeenCalledWith(otherToken, undefined)
    })
})