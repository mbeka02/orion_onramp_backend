import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";

export function validateBody(schema: z.ZodObject<any, any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        }));

        res.status(400).json({
          error: "Validation failed",
          details: errorMessages,
        });
      } else {
        res.status(500).json({
          error: "Internal Server Error",
        });
      }
    }
  };
}

export function validateParams(schema: z.ZodObject<any, any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        }));

        res.status(400).json({
          error: "Invalid parameters",
          details: errorMessages,
        });
      } else {
        res.status(500).json({
          error: "Internal Server Error",
        });
      }
    }
  };
}
export function validateQuery<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.query);
      req.query = validated as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        }));
        res.status(400).json({
          error: "Invalid query parameters",
          details: errorMessages,
        });
      } else {
        res.status(500).json({
          error: "Internal Server Error",
        });
      }
    }
  };
}
