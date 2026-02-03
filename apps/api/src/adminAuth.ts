import jwt from "jsonwebtoken";

type AdminTokenPayload = {
  role: "ADMIN";
};

export class AuthError extends Error {
  statusCode = 401;
}

export function signAdminToken(): string {
  const secret = getJwtSecret();
  return jwt.sign({ role: "ADMIN" } satisfies AdminTokenPayload, secret, {
    expiresIn: "7d",
  });
}

export function verifyAdminToken(token: string): AdminTokenPayload {
  const secret = getJwtSecret();
  const payload = jwt.verify(token, secret);
  if (typeof payload !== "object" || !payload) {
    throw new AuthError("Invalid token");
  }
  if ((payload as { role?: string }).role !== "ADMIN") {
    throw new AuthError("Invalid role");
  }
  return payload as AdminTokenPayload;
}

export function requireAdminFromHeaders(headers: { authorization?: string }) {
  const raw = headers.authorization;
  if (!raw?.startsWith("Bearer ")) throw new AuthError("missing token");

  const token = raw.slice("Bearer ".length).trim();

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (payload?.role !== "ADMIN") throw new AuthError("forbidden");
    return payload;
  } catch {
    // IMPORTANT: wrap any jwt error into AuthError
    throw new AuthError("invalid token");
  }
}

export function validateAdminCredentials(username: string, password: string): boolean {
  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPass = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPass) {
    throw new Error("Admin credentials are not configured");
  }
  return username === expectedUser && password === expectedPass;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return secret;
}

function readHeader(
  headers: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = headers[key];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}
