import express from "express";
import "dotenv/config";
import logger from "./lib/logger";
const app = express();
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
const PORT = process.env.PORT;
const FRONTEND_URL = process.env.FRONTEND_URL;
if (!PORT || !FRONTEND_URL) {
  logger.error("Invalid env setup, set PORT or FRONTEND_URL in env variables");
}
app.use("/", cors({ origin: `http://localhost:3001`, credentials: true }));
// BETTER AUTH ROUTES , DO NOT TAMPER WITH THE CONFIGURATION
// api/auth/sign-up/email
// api/auth/sign-in/email
app.all("/api/auth/{*any}", toNodeHandler(auth));

// Mount express json middleware after Better Auth handler
// or only apply it to routes that don't interact with Better Auth
app.use("/", express.json());

app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});
