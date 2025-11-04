import { drizzle } from "drizzle-orm/node-postgres";
import logger from "../logger";
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  logger.error("Invalid env setup, set  DATABASE_URL in env variables");
}
export const db = drizzle(DATABASE_URL);
