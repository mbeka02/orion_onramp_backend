import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const EMAIL_FROM = process.env.EMAIL_FROM;
const EMAIL_SERVER_HOST = process.env.EMAIL_SERVER_HOST;
const EMAIL_SERVER_PORT = process.env.EMAIL_SERVER_PORT;
const EMAIL_SERVER_USER = process.env.EMAIL_SERVER_USER;
const EMAIL_SERVER_PASSWORD = process.env.EMAIL_SERVER_PASSWORD;
if (
  !EMAIL_FROM ||
  !EMAIL_SERVER_HOST ||
  !EMAIL_SERVER_PORT ||
  !EMAIL_SERVER_USER ||
  !EMAIL_SERVER_PASSWORD
) {
  throw new Error("Email configuration is not set in environment variables.");
}
const transporter = nodemailer.createTransport({
  host: EMAIL_SERVER_HOST,
  port: parseInt(EMAIL_SERVER_PORT),
  secure: parseInt(EMAIL_SERVER_PORT) === 465,
  auth: {
    user: EMAIL_SERVER_USER,
    pass: EMAIL_SERVER_PASSWORD,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error("Mailer Configuration Error:", error);
  } else {
    console.log("Mailer is configured and ready to send emails.");
  }
});

export default transporter;
