import z from "zod";

export enum TRANSACTION_STATUS {
  PENDING = "pending",
  SUCCESSFUL = "successful",
  FAILED = "failed",
  ONRAMPED = "onramped",
  OFFRAMPED = "offramped",
}

// Payment channel enum for validation
export const PaymentChannelEnum = z.enum([
  "card",
  "bank",
  "ussd",
  "qr",
  "mobile_money",
  "bank_transfer",
  "eft",
  "apple_pay",
  "payattitude",
]);

// Token type enum
export const TokenTypeEnum = z.enum(["KESy_MAINNET", "KESy_TESTNET"]);

// Initialize transaction schema
export const initializeTransactionSchema = z.object({
  token: TokenTypeEnum,
  amount: z
    .number()
    .positive("Amount must be a positive number")
    .max(500000, "Amount exceeds maximum transaction limit"),

  email: z.email("Invalid email address").min(1, "Email is required"),

  callback_url: z
    .url({ protocol: /^https$/, error: "Invalid callback URL" })
    .optional(),

  channels: z.array(PaymentChannelEnum).optional(),

  currency: z
    .string()
    .length(3, "Currency must be a 3-letter code")
    .toUpperCase()
    .optional()
    .default("KES"),

  plan: z.string().optional(),

  invoice_limit: z.number().int().positive().optional(),

  metadata: z
    .looseObject({
      orderID: z.string().min(1, "orderID is required in metadata"),
    })
    .refine((data) => data.orderID, {
      message: "orderID is required in metadata",
    }),

  split_code: z.string().optional(),

  subaccount: z.string().optional(),

  transaction_charge: z.number().int().nonnegative().optional(),

  bearer: z.enum(["account", "subaccount"]).optional(),
});

// Verify transaction params schema
export const verifyTransactionParamsSchema = z.object({
  reference: z
    .string()
    .min(1, "Reference is required")
    .regex(/^TXN_/, "Invalid reference format"),
});

// Payment status query schema (if you want to support query-based verification)
export const paymentStatusQuerySchema = z.object({
  reference: z
    .string()
    .min(1, "Reference is required")
    .regex(/^TXN_/, "Invalid reference format"),
});

// Type exports for use in controllers
export type InitializeTransactionInput = z.infer<
  typeof initializeTransactionSchema
>;
export type VerifyTransactionParams = z.infer<
  typeof verifyTransactionParamsSchema
>;
export type PaymentStatusQuery = z.infer<typeof paymentStatusQuerySchema>;
