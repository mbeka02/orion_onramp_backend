import { getAuthContext } from "../lib/auth/utils";
import { NextFunction, Request, Response } from "express";
export async function authenticationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const session = await getAuthContext(req);
  if (!session || !session.user) {
    {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }
  next();
}
