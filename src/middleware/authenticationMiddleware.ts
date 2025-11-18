import { Errors } from "../errors";
import { getAuthContext } from "../lib/auth/utils";
import { NextFunction, Request, Response } from "express";
import environmentModel from "../models/environments";
import logger from "../lib/logger";


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
  try {
    const authorizationHeader = req.headers.authorization;
    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: Errors.UNAUTHORIZED });
    }

    const privateKey = authorizationHeader.split(' ')[1];

    if (!privateKey || privateKey.trim().length === 0) {
      return res.status(401).json({ error: Errors.UNAUTHORIZED });
    }

    const environment_id = await environmentModel.doesPrivateKeyExist(privateKey);
    if (!environment_id) {
      return res.status(401).json({ error: Errors.UNAUTHORIZED });
    }

    req.environment_id = environment_id;
    next();
  } catch (err) {
    logger.error("Validate private key middleware: Could not validate private key", {error: err});
    return res.status(500).json({error: Errors.INTERNAL_SERVER_ERROR});
  }
}