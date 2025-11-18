import { Errors } from "../errors";
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

// Checks if the passed private key is valid
export async function validatePrivateKey(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authorizationHeader = req.headers.authorization;
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    return res.status(401).json({message: Errors.UNAUTHORIZED});
  }

  console.log(authorizationHeader);
  next();
}