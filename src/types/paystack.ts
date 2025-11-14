export interface InitializeTransactionRequest {
  amount: number; // In kobo (NGN) or pesewas (GHS)
  email: string;
  reference?: string; // If not provided, Paystack generates one
  callback_url?: string; // Override dashboard callback URL
  channels?: PaymentChannel[];
  currency?: string;
  plan?: string; // Plan code for subscription
  invoice_limit?: number;
  metadata?: Record<string, any>; // Custom data
  split_code?: string;
  subaccount?: string;
  transaction_charge?: number;
  bearer?: "account" | "subaccount";
}

export type PaymentChannel =
  | "card"
  | "bank"
  | "ussd"
  | "qr"
  | "mobile_money"
  | "bank_transfer"
  | "eft"
  | "apple_pay"
  | "payattitude";

export interface InitializeTransactionResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface VerifyTransactionResponse {
  status: boolean;
  message: string;
  data: TransactionData;
}

export interface FetchTransactionResponse {
  status: boolean;
  message: string;
  data: TransactionData;
}

export interface TransactionData {
  id: number;
  domain: string;
  status: TransactionStatus;
  reference: string;
  amount: number;
  message: string | null;
  gateway_response: string;
  paid_at: string;
  created_at: string;
  channel: PaymentChannel;
  currency: string;
  ip_address: string;
  metadata: Record<string, any>;
  log: TransactionLog;
  fees: number;
  fees_split?: FeesSplit;
  authorization: Authorization;
  customer: Customer;
  plan: Record<string, any> | null; // Can be null or Plan object
  subaccount?: any;
  order_id?: any;
  requested_amount?: number;
  pos_transaction_data?: any;
  source?: any;
  fees_breakdown?: any;
  transaction_date?: string;
  plan_object?: any;
  split?: any;
}

export type TransactionStatus =
  | "success"
  | "failed"
  | "pending"
  | "abandoned"
  | "reversed";

export interface TransactionLog {
  start_time: number;
  time_spent: number;
  attempts: number;
  errors: number;
  success: boolean;
  mobile: boolean;
  input: any[];
  history: LogHistory[];
}

export interface LogHistory {
  type: string;
  message: string;
  time: number;
}

export interface Authorization {
  authorization_code: string;
  bin: string;
  last4: string;
  exp_month: string;
  exp_year: string;
  channel: string;
  card_type: string;
  bank: string;
  country_code: string;
  brand: string;
  reusable: boolean;
  signature: string;
  account_name: string | null;
}

export interface Customer {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
  customer_code: string;
  phone: string | null;
  metadata: Record<string, any> | null;
  risk_action: string;
  international_format_phone?: string | null;
}

export interface FeesSplit {
  paystack: number;
  integration: number;
  subaccount?: number;
  params?: any;
}

export interface PaystackWebhookPayload {
  event: WebhookEvent;
  data: WebhookChargeData;
}

export type WebhookEvent =
  | "charge.success"
  | "charge.failed"
  | "transfer.success"
  | "transfer.failed"
  | "transfer.reversed"
  | "customeridentification.success"
  | "customeridentification.failed"
  | "dedicatedaccount.assign.success"
  | "dedicatedaccount.assign.failed";

export interface WebhookChargeData {
  id: number;
  domain: string;
  status: TransactionStatus;
  reference: string;
  amount: number;
  message: string | null;
  gateway_response: string;
  paid_at: string;
  created_at: string;
  channel: PaymentChannel;
  currency: string;
  ip_address: string;
  metadata: Record<string, any>;
  log: TransactionLog;
  fees: number | null;
  fees_split?: FeesSplit;
  customer: Customer;
  authorization: Authorization;
  plan: Record<string, any>;
  subaccount?: any;
  split?: any;
  order_id?: any;
  requested_amount?: number; // For Pay with Transfer partial payments
}

export interface ListTransactionsResponse {
  status: boolean;
  message: string;
  data: TransactionData[];
  meta: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  total_volume: number;
  skipped: number;
  perPage: number;
  page: number;
  pageCount: number;
}

export interface PaystackErrorResponse {
  status: false;
  message: string;
}

// Type guard for success responses
export function isPaystackSuccess<T>(response: {
  status: boolean;
  data?: T;
}): response is { status: true; data: T } {
  return response.status === true && response.data !== undefined;
}

// Webhook event constants
export const WEBHOOK_EVENTS = {
  CHARGE_SUCCESS: "charge.success",
  CHARGE_FAILED: "charge.failed",
  TRANSFER_SUCCESS: "transfer.success",
  TRANSFER_FAILED: "transfer.failed",
  TRANSFER_REVERSED: "transfer.reversed",
  CUSTOMER_IDENTIFICATION_SUCCESS: "customeridentification.success",
  CUSTOMER_IDENTIFICATION_FAILED: "customeridentification.failed",
  DEDICATED_ACCOUNT_ASSIGN_SUCCESS: "dedicatedaccount.assign.success",
  DEDICATED_ACCOUNT_ASSIGN_FAILED: "dedicatedaccount.assign.failed",
} as const;

// Transaction status constants
export const PAYSTACK_TRANSACTION_STATUS = {
  SUCCESS: "success",
  FAILED: "failed",
  PENDING: "pending",
  ABANDONED: "abandoned",
  REVERSED: "reversed",
} as const;
