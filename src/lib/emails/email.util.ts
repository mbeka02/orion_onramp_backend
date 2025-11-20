import { sendEmail } from "./emailSender";
import ExampleEmail from "./templates/example";
import VerifyEmail from "./templates/verify-email";
import ResetPasswordEmail from "./templates/reset-password";
import TopUpTreasury from "./templates/top-up-tokens";
import "dotenv/config";
import logger from "../logger";
import { TOKEN_TYPE } from "../../types/token";

export class EmailService {
  async testEmail() {
    await sendEmail({
      to: "pashrick237@gmail.com", //Change as you guys test
      subject: "Test Email setup",
      react: ExampleEmail(),
    });
  }
  async verificationEmail(url: string, to: string) {
    try {
      if (typeof url !== "string" || !url.trim()) {
        throw new Error("Invalid arguments for verification email");
      }
      const valid = this.validateEmailAddress(to);
      if (!valid) {
        throw new Error("Invalid email address");
      }
      const verificationResult = await sendEmail({
        to,
        subject: "Verify your email address",
        react: VerifyEmail({ url }),
      });
      if (!verificationResult.success) {
        throw (
          verificationResult.error ??
          new Error("Failed to send verification email")
        );
      }
    } catch (error) {
      logger.error(
        `Error sending verification email to ${to}: ${(error as Error).message}`,
      );
      throw error;
    }
  }
  async resetPasswordEmail(url: string, to: string) {
    try {
      if (typeof url !== "string" || !url.trim()) {
        throw new Error("Invalid arguments for reset password email");
      }
      const valid = this.validateEmailAddress(to);
      if (!valid) {
        throw new Error("Invalid email address");
      }
      const resetResult = await sendEmail({
        to,
        subject: "Reset your password",
        react: ResetPasswordEmail({ url }),
      });
      if (!resetResult.success) {
        throw (
          resetResult.error ?? new Error("Failed to send reset password email")
        );
      }
    } catch (error) {
      logger.error(
        `Error sending reset password email to ${to}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  async topUpTreasury(token: TOKEN_TYPE, amount?: number) {
    try {
      if (!process.env.TREASURY_OVERLOOK_EMAIL) {
        throw new Error("Invalid env setup, set TREASURY_OVERLOOK_EMAIL")
      }
      await sendEmail({
        to: process.env.TREASURY_OVERLOOK_EMAIL,
        subject: "Top Up Treasury",
        react: TopUpTreasury({token, amount})
      })
    } catch(err) {
      logger.error("Email Util: Could not send Top Up Treasury Email", {error: err});
      throw new Error("Could not send top up treasury email");
    }
  }

  validateEmailAddress(email: string): boolean {
    if (typeof email !== "string" || !email) return false;
    if (email.trim() === "") return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

export const emailService = new EmailService();
