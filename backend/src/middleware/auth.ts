import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: {
    sub: number;
    email: string;
    name: string | null;
  };
}

function isAuthPayload(value: unknown): value is AuthRequest["user"] {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const payload = value as Record<string, unknown>;
  return (
    typeof payload.sub === "number" &&
    typeof payload.email === "string" &&
    (typeof payload.name === "string" || payload.name === null)
  );
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
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    if (!isAuthPayload(payload)) {
      res.status(401).json({ error: "Unauthorized — invalid token payload" });
      return;
    }
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Token expired or invalid" });
  }
}
