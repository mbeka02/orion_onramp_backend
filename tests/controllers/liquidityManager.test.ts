import liquidityManagerController from "../../src/controllers/liquidityManager";
import { TOKEN_TYPE } from "../../src/types/token"
import { liquidityModelMock } from "../mocks/liquidity_model_mock";

describe("Liquidity Managers Tests: Treasury Balance checker", () => {
    const token = TOKEN_TYPE.KESy_MAINNET;
    const tooMuch = 100000000;
    const enough = 10000;

    beforeAll(async () => {
        liquidityModelMock.getCachedTreasuryTokenBalance = jest.fn().mockImplementation((token_type) => {
            return new Promise((res, rej) => {
                if (token_type === token) {
                    res(enough);
                } else {
                    res(0);
                }
            })
        });
    })

    it("should return false if treasury does not have balance", async () => {
        const isEnough = await liquidityManagerController.doesTreasuryHaveBalance(token, tooMuch, liquidityModelMock);
        expect(isEnough).toBe(false);
    });
})