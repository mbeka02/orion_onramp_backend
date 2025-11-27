import "dotenv/config";
import { createClient, RedisClientType } from "redis";

if (!process.env.REDIS_URL) {
  throw new Error("Invalid env setup, set REDIS_URL variable");
}

const client: RedisClientType = createClient({
  url: process.env.REDIS_URL,
});

client.on("error", (err) => console.log("Redis Client Error", err));

export default client;
