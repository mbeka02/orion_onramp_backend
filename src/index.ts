import express from "express";
import "dotenv/config";
import logger from "./lib/logger";
const app = express();
import cors from "cors";
import { drizzle } from 'drizzle-orm/node-postgres';


const PORT = process.env.PORT;
const DATABASE_URL = process.env.DATABASE_URL;
if (!PORT || !DATABASE_URL) {
    logger.error("Invalid env setup, set PORT and DATABASE_URL in env variables");
}

app.use("/", cors({origin: `http://localhost:${PORT}`, credentials: true}));
app.use("/", express.json());

app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
});

export const db = drizzle(DATABASE_URL);