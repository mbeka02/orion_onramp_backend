import { sendEmail } from './emailSender';
import ExampleEmail from './templates/example';
import VerifyEmail from "./templates/verify-email"
import ResetPasswordEmail from "./templates/reset-password"
import logger from '../logger';
export class EmailService {
    async testEmail() {
        await sendEmail({
            to: "pashrick237@gmail.com", //Change as you guys test
            subject: "Test Email setup",
            react: ExampleEmail()
        })
    }
    async verificationEmail(url: string, to: string) {
        try {
            if (typeof (url) !== 'string' || !url.trim()) {
                throw new Error("Invalid arguments for verification email");
            }
            const valid = this.validateEmailAddress(to);
            if (!valid) {
                throw new Error("Invalid email address");
            }
            await sendEmail({
                to,
                subject: "Verify your email address",
                react: VerifyEmail({ url })
            });
        }
        catch (error) {
            logger.error(`Error sending verification email to ${to}: ${(error as Error).message}`);
            throw error;
        }
    }
    async resetPasswordEmail(url: string, to: string) {
        try {
            if (typeof (url) !== 'string' || !url.trim()) {
                throw new Error("Invalid arguments for reset password email");
            }
            const valid = this.validateEmailAddress(to);
            if (!valid) {
                throw new Error("Invalid email address");
            }
            await sendEmail({
                to,
                subject: "Reset your password",
                react: ResetPasswordEmail({ url })
            });
        } catch (error) {
            logger.error(`Error sending reset password email to ${to}: ${(error as Error).message}`);
            throw error;
        }
    }
    private validateEmailAddress(email: string): boolean {
        if (typeof (email) !== 'string' || !email) return false;
        if (email.trim() === '') return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}

export const emailService = new EmailService();