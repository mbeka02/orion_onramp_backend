import { sendEmail } from './emailSender';
import ExampleEmail from './templates/example';
export class EmailService {
    async testEmail(){
        await sendEmail({
            to: "pashrick237@gmail.com", //Change as you guys test
            subject: "Test Email setup",
            react: ExampleEmail()
        })
    }
}

export const emailService = new EmailService();