import { render } from "@react-email/render";
import transporter from "./mailer";
import React from "react";
import logger from "../logger";

interface SendEmailOptions {
  to: string;
  subject: string;
  react: React.ReactElement;
}

export const sendEmail = async ({ to, subject, react }: SendEmailOptions) => {
  const html = await render(react);

  const options = {
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(options);
    console.log(
      `Email sent successfully to ${to}! Message ID: ${info.messageId}`,
    );
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error(`Error sending email to ${to}:`, { error });

    return { success: false, error };
  }
};
