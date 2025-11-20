import "dotenv/config";
import logger from "../logger";
import {InfisicalSDK} from "@infisical/sdk";

export enum InfisicalKeys {
    KESy_TESTNET_PRIVATE_KEY = "KESy_TESTNET_PRIVATE_KEY",
    KESy_TESTNET_KEY_ACCOUNT_ID = "KESy_TESTNET_KEY_ACCOUNT_ID"
}

class Infisical {
    private client: InfisicalSDK
    private isLoggedIn: boolean

    constructor() {
        this.isLoggedIn = false;
        this.client = new InfisicalSDK();
    }

    private async _login() {
        try {
            if(!process.env.INFISICAL_CLIENT_ID || !process.env.INFISICAL_CLIENT_SECRET) {
                throw new Error("Invalid env setup, set INFISICAL_CLIENT_ID and INFISICAL_CLIENT_SECRET in env");
            }

            await this.client.auth().universalAuth.login({
                clientId: process.env.INFISICAL_CLIENT_ID,
                clientSecret: process.env.INFISICAL_CLIENT_SECRET
            });
        } catch(err) {
            logger.error("Infisical: Error logging in to infisical", {error: err});
            throw new Error("Error logging in to infisical");
        }
    }

    async getSecret(key: InfisicalKeys, environment: "dev" | "prod" | "staging"): Promise<string> {
        try {
            if (!process.env.INFISICAL_PROJECT_ID) {
                throw new Error("Invalid env setup, set INFISICAL_PROJECT_ID in env");
            }

            if (this.isLoggedIn === false) {
                await this._login();
            } else {
                await this.client.auth().universalAuth.renew();
            }
            
            const secret = await this.client.secrets().getSecret({
                environment,
                projectId: process.env.INFISICAL_PROJECT_ID,
                secretName: key
            });
            return secret.secretValue;
        } catch(err) {
            logger.error("Infisical: Error getting secret from infisical", {error: err, key});
            throw new Error("Error getting secret from infisical");
        }
    }
}

const infisical = new Infisical();
export default infisical;