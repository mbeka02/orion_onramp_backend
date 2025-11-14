import logger from "../../lib/logger";
import { API_NODES, hederaTokenBalanceSchema, SUPPORTED_CHAINS } from "../../types/chain";
import { AccountId } from "@hiero-ledger/sdk";

export class HederaChainModel {
    _isHederaFormatAddress(address: string): boolean {
        const hederaAddressFormatRegex = /^\d+\.\d+\.\d+$/;
        return hederaAddressFormatRegex.test(address);
    }

    async getTokenBalance(chain: SUPPORTED_CHAINS, account: string, token: string): Promise<{balance: BigInt, decimals?: number}> {
        try {
            // Put account and token in Hedera format
            let accountAddress = account;
            let tokenID = token;

            if (!this._isHederaFormatAddress(account)) {
                accountAddress = AccountId.fromEvmAddress(0, 0, account).toString();
            }

            if (!this._isHederaFormatAddress(token)) {
                tokenID = AccountId.fromEvmAddress(0, 0, token).toString();
            }

            const controller = new AbortController();
            const timeoutID = setTimeout(() => controller.abort(), 10000) // Timeout after 10 seconds

            // Get token balance on chain
            let response = null;
            if (chain === SUPPORTED_CHAINS.HEDERA_MAINNET) {
                const res = await fetch(`${API_NODES.HEDERA_MAINNET}/api/v1/accounts/${accountAddress}/tokens?token.id=${tokenID}`, {
                    signal: controller.signal
                }).finally(() => clearTimeout(timeoutID));
                if (res.status === 200) {
                    response = await res.json();
                } else {
                    throw new Error("Could not get token balance from mirror node");
                }
            } else if (chain === SUPPORTED_CHAINS.HEDERA_TESTNET) {
                const res = await fetch(`${API_NODES.HEDERA_TESTNET}/api/v1/accounts/${accountAddress}/tokens?token.id=${tokenID}`, {
                    signal: controller.signal
                }).finally(() => clearTimeout(timeoutID));
                if (res.status === 200) {
                    response = await res.json();
                } else {
                    throw new Error("Could not get token balance from mirror node");
                }
            } else {
                throw new Error("Not a Hedera chain");
            }

            // Process data
            const parsed = hederaTokenBalanceSchema.safeParse(response);
            if (parsed.error) {
                throw new Error("Could not parse data from hedera", {cause: parsed.error.issues});
            }
            const data = parsed.data;

            for (const token of data.tokens) {
                if (token.token_id.toLowerCase() === tokenID.toLowerCase()) {
                    return {balance: BigInt(token.balance), decimals: token.decimals};
                }
            }

            return {balance: BigInt(0)};
        } catch (err) {
            logger.error("Error getting token balance on Hedera", { error: err, chain, account, token });
            throw new Error("Error getting token balance on Hedera");
        }
    }
}

const hederaChainModel = new HederaChainModel();
export default hederaChainModel;