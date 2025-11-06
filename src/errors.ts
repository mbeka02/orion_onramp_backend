export class MyError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "MyError";
    this.cause = options?.cause
  }
}

export enum Errors {
  BUSINESS_ALREADY_HAS_ENVIRONMENT = "Business environment already created",
  INTERNAL_SERVER_ERROR = "Internal Server Error"
}