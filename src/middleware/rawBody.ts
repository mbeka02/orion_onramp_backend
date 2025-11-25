import { Request, Response, NextFunction } from "express";

export function preserveRawBody(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (req.path === "/api/transaction/webhook/paystack") {
    let data = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      (req as any).rawBody = data;
      next();
    });
    req.on("error", (err) => {
      next(err);
    });
  } else {
    next();
  }
}
