export class MyError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "MyError";
    this.cause = options?.cause;
  }
}

export enum Errors {
  BUSINESS_ALREADY_HAS_ENVIRONMENT = "Business environment already created",
  BUSINESS_DOES_NOT_HAVE_ENVIRONMENT = "Business does not have environment",
  BUSINESS_DOES_NOT_HAVE_KEYS = "Business does not have keys",
  BUSINESS_NOT_FOUND = "Business not found",
  UNAUTHORIZED = "Unauthorized",
  FORBIDDEN = "Forbidden",
  INVALID_BUSINESS_DATA = "Invalid business data",
  BUSINESS_CREATION_FAILED = "Could not create business",
  INVITATION_FAILED = "Could not create invitation",
  REGISTRATION_NUMBER_TAKEN = "Business registration number already in use",
  UNAUTHORIZED_PAYMENT = "Unauthorized payment",
  PAYMENT_ALREADY_ONRAMPED = "Payment already onramped",
  PAYMENT_NOT_COMPLETE = "Payment not complete",
  TREASURY_DOES_NOT_HAVE_ENOUGH = "Treasury does not have enough",
  RECEIVER_NOT_ASSOCIATED = "Receiver has not associated",
  BUSINESS_NOT_SET_WALLET = "Business has not set wallet",
  BUSINESS_NOT_ASSOCIATED = "Business has not associated",
  BUSINESS_NOT_APPROVED = "Business is not approved",
  INTERNAL_SERVER_ERROR = "Internal Server Error",

  // transactions
  TRANSACTION_NOT_FOUND = "Transaction not found",
  REFERENCE_NOT_FOUND = "Reference not found",
  MISSING_REFERENCE = "The Reference is missing",
  TRANSACTION_AMOUNT_EXCEEDS_LIMIT = "Amount exceeds maximum transaction limit",
  TRANSACTION_MISSING_ORDER_ID = "Missing or invalid 'orderID' in metadata",
  TRANSACTION_ALREADY_INITIALIZED = "Payment already initialized",
  TRANSACTION_CREATION_FAILED = "Failed to create transaction",
  TRANSACTIONS_FETCH_FAILED = "Error fetching transactions",
  TRANSACTION_FETCH_FAILED = "Error fetching transaction",
  PAYSTACK_API_ERROR = "Payment provider error",
  PAYSTACK_VERIFICATION_FAILED = "Failed to verify payment",
  TRANSACTION_VIEW_FORBIDDEN = "You do not have permission to view these payment details",
  //Admin
  ADMIN_ALREADY_EXISTS = "Admin with this email already exists",
  WRONG_ADMIN_CREDENTIALS = "Wrong admin credentials",
  ADMIN_NOT_FOUND = "Admin not found",
}
