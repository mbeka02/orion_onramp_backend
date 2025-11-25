import { EmailService } from "../../src/lib/emails/email.util";

export const emailServiceMock = {
  testEmail: jest.fn(),
  verificationEmail: jest.fn(),
  resetPasswordEmail: jest.fn(),
  topUpTreasury: jest.fn(),
  validateEmailAddress: jest.fn(),
} as EmailService;
