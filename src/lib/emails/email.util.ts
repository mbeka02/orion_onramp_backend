import { sendEmail } from './emailSender';
import ExampleEmail from './templates/example';
import VerifyEmail from "./templates/verify-email"
import ResetPasswordEmail from "./templates/reset-password"
export class EmailService {
    async testEmail() {
        await sendEmail({
            to: "pashrick237@gmail.com", //Change as you guys test
            subject: "Test Email setup",
            react: ExampleEmail()
        })
    }
    async verificationEmail(url: string, to: string) {
        if (typeof (url) !== 'string' || !to) {
            throw new Error("Invalid arguments for verification email");
        }
        await sendEmail({
            to,
            subject: "Verify your email address",
            react: VerifyEmail({ url })
        });
    }
    async resetPasswordEmail(url: string, to: string) {
        if (typeof (url) !== 'string' || !to) {
            throw new Error("Invalid arguments for reset password email");
        }
        await sendEmail({
            to,
            subject: "Reset your password",
            react: ResetPasswordEmail({ url })
        });
    }
}

export const emailService = new EmailService();