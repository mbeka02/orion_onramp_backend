export class MyError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "MyError";
    this.cause = options?.cause
  }
}

export enum Errors {
  BUSINESS_ALREADY_HAS_ENVIRONMENT = "Business environment already created",
  BUSINESS_DOES_NOT_HAVE_ENVIRONMENT = "Business does not have environment",
  BUSINESS_DOES_NOT_HAVE_KEYS = "Business does not have keys",
  UNAUTHORIZED_PAYMENT = "Unauthorized payment",
  PAYMENT_ALREADY_ONRAMPED = "Payment already onramped",
  PAYMENT_NOT_COMPLETE = "Payment not complete",
  INTERNAL_SERVER_ERROR = "Internal Server Error"
}
