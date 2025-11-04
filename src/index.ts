import express from "express";
import "dotenv/config";
import logger from "./lib/logger";
const app = express();
import cors from "cors";
import { drizzle } from 'drizzle-orm/node-postgres';


const PORT = process.env.PORT;
const DATABASE_URL = process.env.DATABASE_URL;
const FRONTEND_URL = process.env.FRONTEND_URL;

if (!PORT || !DATABASE_URL || !FRONTEND_URL) {
    logger.error("Invalid env setup, set PORT, FRONTEND_URL and DATABASE_URL in env variables");
}

app.use("/", cors({origin: FRONTEND_URL, credentials: true}));
app.use("/", express.json());

app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
});

export const db = drizzle(DATABASE_URL);