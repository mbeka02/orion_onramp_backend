import { type Request } from "express";
import { auth } from ".";
import { fromNodeHeaders } from "better-auth/node";

export const getAuthContext = async (req: Request) => {
  const headers = req.headers;
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(headers),
  });
  return session;
};
