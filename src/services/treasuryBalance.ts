import logger from "../lib/logger";
import { TOKEN_TYPE } from "../types/token";
import liquidityModel from "../models/liquidityManager";
import hederaChainModel from "../models/chain/hedera";
import { db } from "../lib/db";
import { treasuryBalanceTable } from "../lib/db/schema";
import { eq } from "drizzle-orm";
import cron, { ScheduledTask } from "node-cron";
let cronJob: ScheduledTask | null = null;

async function updateCachedTreasuryBalances() {
    try {
        // TO DO: Make this function wait for balance check queue to be empty
        const tokens = [TOKEN_TYPE.KESy_MAINNET, TOKEN_TYPE.KESy_TESTNET];

        for (const token of tokens) {
            const balance = await liquidityModel.getTreasuryBalanceFromOnchain(token, hederaChainModel);

            // Update balance in db
            await db.update(treasuryBalanceTable).set({
                balance: balance
            }).where(eq(treasuryBalanceTable.token, token));
        }
    } catch(err) {
        logger.error("Error updating cached treasury balance", {error: err});
    }
}

/* Initialize periodic treasury cache updates
   Default: every hour
 */
export function startCachedTreasuryBalanceUpdate(
  cronSchedule: string = "0 * * * *",
): void {
  logger.info(`Starting cached treasury balance updates with schedule: ${cronSchedule}`);

  updateCachedTreasuryBalances().catch((err) =>
    logger.error(`Initial cached treasury balance update failed:${err}`),
  );
  cronJob = cron.schedule(cronSchedule, async () => {
    logger.info(`[${new Date()}] running scheduled cached treasury balance update...`);
    try {
      await updateCachedTreasuryBalances();
    } catch (err) {
      logger.error(`Scheduled update failed:${err}`);
    }
  });
}

export function stopCachedTreasuryBalanceUpdates(): void {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    logger.info("Cached treasury balance updates stopped");
  }
}

