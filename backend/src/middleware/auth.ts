import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: {
    sub: number;
    email: string;
    name: string | null;
  };
}

export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized — missing token" });
    return;
  }

  const token = auth.replace("Bearer ", "");

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      sub: number;
      email: string;
      name: string | null;
    };
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Token expired or invalid" });
  }
}
