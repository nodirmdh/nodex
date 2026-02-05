import jwt from "jsonwebtoken";
import { AuthPayload, Role } from "./types";

export class AuthError extends Error {
  statusCode = 401;
}

const ROLE_SET: Role[] = ["ADMIN", "VENDOR", "COURIER", "CLIENT"];

export function signAuthToken(payload: AuthPayload, expiresIn = "7d"): string {
  const secret = getJwtSecret();
  return jwt.sign(payload, secret, { expiresIn });
}

export function verifyAuthToken(token: string): AuthPayload {
  const secret = getJwtSecret();
  const payload = jwt.verify(token, secret);
  if (!payload || typeof payload !== "object") {
    throw new AuthError("Invalid token");
  }

  const role = (payload as { role?: string }).role;
  if (!role || !ROLE_SET.includes(role as Role)) {
    throw new AuthError("Invalid role");
  }

  const sub = (payload as { sub?: string }).sub;
  if (!sub && role !== "ADMIN") {
    throw new AuthError("Invalid token");
  }

  return {
    sub: sub ?? "admin",
    role: role as Role,
    vendorId: (payload as { vendorId?: string }).vendorId,
    courierId: (payload as { courierId?: string }).courierId,
    clientId: (payload as { clientId?: string }).clientId,
  };
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return secret;
}
