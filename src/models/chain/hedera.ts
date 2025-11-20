import logger from "../../lib/logger";
import { API_NODES, hederaAccountDetailsSchema, hederaTokenBalanceSchema, SUPPORTED_CHAINS } from "../../types/chain";
import { AccountId, Client,PrivateKey, PublicKey, ReceiptStatusError, TransferTransaction } from "@hiero-ledger/sdk";
import "dotenv/config";
import { TOKEN_TYPE } from "../../types/token";
import infisical, { InfisicalKeys } from "../../lib/infisical";
import { Errors, MyError } from "../../errors";

export class HederaChainModel {
    _isHederaFormatAddress(address: string): boolean {
        const hederaAddressFormatRegex = /^\d+\.\d+\.\d+$/;
        return hederaAddressFormatRegex.test(address);
    }

    async _getKeys(tokenType: TOKEN_TYPE): Promise<{ public: PublicKey, private: PrivateKey }[]> {
        try {
            if (tokenType === TOKEN_TYPE.KESy_TESTNET) {
                if (!process.env.KESy_TESTNET_PRIVATE_KEY || !process.env.KESy_TESTNET_KEY_ACCOUNT_ID) {
                    throw new Error("Invalid env, setup KESy_TESTNET_PRIVATE_KEY and KESy_TESTNET_KEY_ACCOUNT_ID in env");
                }

                const key1 = PrivateKey.fromStringECDSA(process.env.KESy_TESTNET_PRIVATE_KEY);
                const privateKey2 = await infisical.getSecret(InfisicalKeys.KESy_TESTNET_PRIVATE_KEY, "staging");
                const key2 = PrivateKey.fromStringECDSA(privateKey2);

                return [{ private: key1, public: key1.publicKey }, { private: key2, public: key2.publicKey }]
            } else {
                throw new Error("Unsupported token type");
            }
        } catch (err) {
            logger.error("Hedera Chain Model: Could not get multi signature key", { error: err });
            throw new Error("Could not get multi signature account");
        }
    }

    _getClient(network: "test" | "main"): Client {
        try {
            if (!process.env.HEDERA_BACKEND_ACCOUNT_ID || !process.env.HEDERA_BACKEND_PRIVATE_KEY) {
                throw new Error("Invalid env setup, set HEDERA_BACKEND_ACCOUNT_ID and HEDERA_BACKEND_PRIVATE_KEY in env");
            }

            const accountID = AccountId.fromString(process.env.HEDERA_BACKEND_ACCOUNT_ID);
            const privateKey = PrivateKey.fromStringECDSA(process.env.HEDERA_BACKEND_PRIVATE_KEY);

            if (network === 'test') {
                const client = Client.forTestnet();
                client.setOperator(accountID, privateKey);
                return client;
            } else {
                throw new Error("Network not yet supported")
            }
        } catch (err) {
            logger.error("Hedera Chain Model: Could not get client for network", {error: err, network});
            throw new Error("Could not get client");
        }
    }

    async _checkIfAssociated(tokenType: TOKEN_TYPE, token: string, accountid: string): Promise<boolean> {
        try {
            if (tokenType === TOKEN_TYPE.KESy_TESTNET) {
                if (!process.env.HEDERA_TESTNET_MIRROR_NODE_API) {
                    throw new Error("Invalid env setup, set HEDERA_TESTNET_MIRROR_NODE_API in env");
                }
                const baseUrl = process.env.HEDERA_TESTNET_MIRROR_NODE_API;
                let nextLink: string | null = `/api/v1/accounts/${accountid}/tokens?limit=100`;

                let tokenAddress = token;
                if (!this._isHederaFormatAddress(token)) {
                    tokenAddress = AccountId.fromEvmAddress(0, 0, token).toString();
                }

                while (nextLink) {
                    const res = await fetch(`${baseUrl}${nextLink}`, {method: 'GET'});
                    if (res.status === 200) {
                        const json = await res.json();
                        const parsed = hederaAccountDetailsSchema.safeParse(json);
                        if (parsed.success) {
                            const data = parsed.data;
                            const isTokenAssociated = data.tokens.find((t) => t.token_id.toLowerCase() === tokenAddress.toLowerCase());
                            if (isTokenAssociated) {
                                return true;
                            } else {
                                nextLink = data.links.next;
                            }
                        } else {
                            break;
                        }
                    } else {
                        break
                    }
                }

                return false;
            } else {
                throw new Error("Unsupported token type");
            }
        } catch (err) {
            console.error("Error checking if account has associated token", err);
            logger.error("Hedera Contract: Error checking if account has associated", { error: err, token, accountid });
            throw new Error("Error checking if account has associated");
        }
    }

    async transferTokenFromTreasuryToAccount(tokenType: TOKEN_TYPE, treasuryAccount: string, token: string, receiverAccount: string, amount: number) {
        try {
            if (tokenType === TOKEN_TYPE.KESy_TESTNET) {
                const hasReceiverAssociated = await this._checkIfAssociated(tokenType, token, receiverAccount);
                if (hasReceiverAssociated === false) {
                    throw new MyError(Errors.RECEIVER_NOT_ASSOCIATED);
                }

                let treasuryAccountID: AccountId;
                if (this._isHederaFormatAddress(treasuryAccount)) {
                    treasuryAccountID = AccountId.fromString(treasuryAccount)
                } else {
                    treasuryAccountID = AccountId.fromEvmAddress(0, 0, treasuryAccount);
                }

                let tokenID: AccountId;
                if (this._isHederaFormatAddress(token)) {
                    tokenID = AccountId.fromString(token);
                } else {
                    tokenID = AccountId.fromEvmAddress(0, 0, token);
                }

                let receiverID: AccountId;
                if (this._isHederaFormatAddress(receiverAccount)) {
                    receiverID = AccountId.fromString(receiverAccount);
                } else {
                    receiverID = AccountId.fromEvmAddress(0, 0, receiverAccount);
                }

                const keys = await this._getKeys(tokenType);

                const nodeAccountID = [new AccountId(5), new AccountId(6)]

                const client = this._getClient("test");
                const transferTx = new TransferTransaction()
                    .addTokenTransfer(tokenID, treasuryAccountID, -amount)
                    .addTokenTransfer(tokenID, receiverID, amount)
                    .setNodeAccountIds(nodeAccountID);

                const transaction = await transferTx.freezeWith(client);
                const signature1 = keys[0].private.signTransaction(transaction);
                const signature2 = keys[1].private.signTransaction(transaction);

                const signedTransaction = transaction.addSignature(keys[0].public, signature1).addSignature(keys[1].public, signature2);
                const submitTx = await signedTransaction.execute(client);
                const receiptTransferTxn = await submitTx.getReceipt(client);
                const status = receiptTransferTxn.status;
                if (status.toString() !== "SUCCESS") {
                    throw new Error("Could not send tokens");
                }
                const txID = submitTx.transactionId.toString();
            } else {
                throw new Error("Token not supported");
            }
        } catch (err) {
            if (err instanceof ReceiptStatusError) {
                if (err.status._code === 178) {
                    throw new MyError(Errors.TREASURY_DOES_NOT_HAVE_ENOUGH);
                }
            }
            if (err instanceof MyError) {
                throw err;
            }
            logger.error("Hedera Chain Model", {error: err});
            throw err;
        }
    }

    async getTokenBalance(chain: SUPPORTED_CHAINS, account: string, token: string): Promise<{ balance: BigInt, decimals?: number }> {
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
                throw new Error("Could not parse data from hedera", { cause: parsed.error.issues });
            }
            const data = parsed.data;

            for (const token of data.tokens) {
                if (token.token_id.toLowerCase() === tokenID.toLowerCase()) {
                    return { balance: BigInt(token.balance), decimals: token.decimals };
                }
            }

            return { balance: BigInt(0) };
        } catch (err) {
            logger.error("Error getting token balance on Hedera", { error: err, chain, account, token });
            throw new Error("Error getting token balance on Hedera");
        }
    }
}

const hederaChainModel = new HederaChainModel();
export default hederaChainModel;