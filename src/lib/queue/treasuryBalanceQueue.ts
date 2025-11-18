import PQueue from "p-queue";

const treasuryBalanceQueue = new PQueue({concurrency: 1});
export default treasuryBalanceQueue;