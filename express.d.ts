import { Request } from "express";

declare global {
  namespace Express {
    interface Request {
      environment_id?: string; // Store environment id for transaction initialize
    }
  }
}
