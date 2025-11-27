import "dotenv/config";
import { createClient, RedisClientType } from "redis";
import logger from "../logger";

if (!process.env.REDIS_URL) {
  throw new Error("Invalid env setup, set REDIS_URL variable");
}

const client: RedisClientType = createClient({
  url: process.env.REDIS_URL,
});

client.on("error", (err) => logger.error("Redis Client Error", err));

export default client;
