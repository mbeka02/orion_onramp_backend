import "dotenv/config";
import logger from "../logger";
import { InfisicalSDK } from "@infisical/sdk";
import sleep from "../sleep";
import redisClient from "../redis";

export enum InfisicalKeys {
  KESy_TESTNET_PRIVATE_KEY = "KESy_TESTNET_PRIVATE_KEY",
  KESy_TESTNET_KEY_ACCOUNT_ID = "KESy_TESTNET_KEY_ACCOUNT_ID",
}

const MAX_RETRIES = 5;
const REDIS_INFISICAL_LOGIN_KEY = 'redis_login_key';

class Infisical {
  private client: InfisicalSDK;

  constructor() {
    this.client = new InfisicalSDK();
  }

  private async _login() {
    try {
      if (
        !process.env.INFISICAL_CLIENT_ID ||
        !process.env.INFISICAL_CLIENT_SECRET
      ) {
        throw new Error(
          "Invalid env setup, set INFISICAL_CLIENT_ID and INFISICAL_CLIENT_SECRET in env",
        );
      }

      await this.client.auth().universalAuth.login({
        clientId: process.env.INFISICAL_CLIENT_ID,
        clientSecret: process.env.INFISICAL_CLIENT_SECRET,
      });
    } catch (err) {
      logger.error("Infisical: Error logging in to infisical", { error: err });
      throw new Error("Error logging in to infisical");
    }
  }

  async getSecret(
    key: InfisicalKeys,
    environment: "dev" | "prod" | "staging",
    retry: number = 0
  ): Promise<string> {
    try {
      if (!process.env.INFISICAL_PROJECT_ID) {
        throw new Error("Invalid env setup, set INFISICAL_PROJECT_ID in env");
      }

      logger.info("Trying to connect another redis session");
      const redisConn = await redisClient.connect();
      try {
        const isRenewed = await redisConn.get(REDIS_INFISICAL_LOGIN_KEY);
        if (!isRenewed) {
          await this._login();
          await redisConn.set(REDIS_INFISICAL_LOGIN_KEY, 'true', {
            EX: 3600
          });
        }
      } catch (err) {
        logger.info("Error renewing", { error: err });
      } finally {
        await redisConn.quit();
        logger.info("Quit redis connection");
      }

      const secret = await this.client.secrets().getSecret({
        environment,
        projectId: process.env.INFISICAL_PROJECT_ID,
        secretName: key,
      });
      return secret.secretValue;
    } catch (err) {
      logger.error("Infisical: Error getting secret from infisical", {
        error: err,
        key,
      });

      if (retry < MAX_RETRIES) {
        await sleep((2 ** retry) * 1000);
        await this.getSecret(key, environment, retry + 1);
      }

      throw new Error("Error getting secret from infisical");
    }
  }
}

const infisical = new Infisical();
export default infisical;
