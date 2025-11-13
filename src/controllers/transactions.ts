import "dotenv/config";

class TransactionController {
  private apiKey: string;
  constructor() {
    const PAYSTACK_TEST_SECRET = process.env.PAYSTACK_TEST_SECRET_KEY;
    const PAYSTACK_LIVE_SECRET = process.env.PAYSTACK_LIVE_SECRET_KEY;
    if (!PAYSTACK_TEST_SECRET || !PAYSTACK_LIVE_SECRET) {
      throw new Error(
        "Invalid env setup , ensure that the paytack api keys have been configured",
      );
    }
    this.apiKey =
      process.env.NODE_ENV === "production"
        ? PAYSTACK_LIVE_SECRET
        : PAYSTACK_TEST_SECRET;
  }
  async intializeTransaction() { }
  async verifyTransaction() { }
  async fetchTransaction() { }
}
