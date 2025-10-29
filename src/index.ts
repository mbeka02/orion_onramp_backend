import express from "express";
import "dotenv/config";
import logger from "./lib/logger";
const app = express();
import cors from "cors";

const PORT = process.env.PORT;
if (!PORT) {
    logger.error("Invalid env setup, set PORT in env variables");
}

app.use("/", cors({origin: `http://localhost:${PORT}`, credentials: true}));
app.use("/", express.json());

app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
});