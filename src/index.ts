import express from "express";
import "dotenv/config";
import logger from "./lib/logger";
const app = express();
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import environmentRouter from "./routes/environment";
import businessRouter from "./routes/business";
import transactionRouter from "./routes/transaction";
import { Server } from "http";
import {
  startCachedTreasuryBalanceUpdate,
  stopCachedTreasuryBalanceUpdates,
} from "./services/treasuryBalance";
import { preserveRawBody } from "./middleware/rawBody";
import adminRouter from "./routes/admin";
const PORT = process.env.PORT;
const DATABASE_URL = process.env.DATABASE_URL;
const FRONTEND_URL = process.env.FRONTEND_URL;

if (!PORT || !DATABASE_URL || !FRONTEND_URL) {
  logger.error(
    "Invalid env setup, set PORT, FRONTEND_URL and DATABASE_URL in env variables",
  );
  process.exit(1);
}
app.use("/", cors({ origin: FRONTEND_URL, credentials: true }));
// BETTER AUTH ROUTES , DO NOT TAMPER WITH THE CONFIGURATION
// api/auth/sign-up/email
// api/auth/sign-in/email
app.all("/api/auth/{*any}", toNodeHandler(auth));
app.use(preserveRawBody);
// Mount express json middleware after Better Auth handler
// or only apply it to routes that don't interact with Better Auth
app.use("/", express.json());
app.get("/health", async (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "Orion",
  });
});
app.use("/api/environment", environmentRouter);
app.use("/api/business", businessRouter);
app.use("/api/transaction", transactionRouter);
// app.use("/api/admin", adminRouter);
let server: Server;
let isShuttingDown = false;
// Start background job
async function initialize(): Promise<void> {
  try {
    // Start background cached treasury balance update every hour
    startCachedTreasuryBalanceUpdate("0 * * * *");
    logger.info("Cached treasury balance updates initialized successfully");
  } catch (err) {
    logger.error(
      `Failed to initialize cached treasury balance update service:${err}`,
    );
    process.exit(1);
  }
}

async function gracefulShutdown(signal: string): Promise<void> {
  //prevent multiple shutdown calls
  if (isShuttingDown) {
    return;
  }
  logger.info(`${signal} received. Starting graceful shutdown...`);
  isShuttingDown = true;
  const forceShutdownTimeout = setTimeout(() => {
    logger.error("Graceful shutdown timed out. Forcing shutdown...");
    process.exit(1);
  }, 10000); // 10 seconds timeout

  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) {
            logger.error(`Error closing HTTP server:${err}`);
            reject(err);
          } else {
            logger.info("HTTP server closed");
            resolve();
          }
        });
      });
    }
    stopCachedTreasuryBalanceUpdates();
    logger.info("Background job stopped");

    clearTimeout(forceShutdownTimeout);

    logger.info("Graceful shutdown completed successfully");
    process.exit(0);
  } catch (err) {
    logger.error(`Error during graceful shutdown:${err}`);
    clearTimeout(forceShutdownTimeout);
    process.exit(1);
  }
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
initialize().then(() => {
  server = app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
  });
});
