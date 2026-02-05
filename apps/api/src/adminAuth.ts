import { AuthError, requireRoleFromHeaders, signAuthToken, verifyAuthToken } from "./auth";

type AdminTokenPayload = {
  role: "ADMIN";
  sub: string;
};

export function signAdminToken(): string {
  return signAuthToken({ role: "ADMIN", sub: "admin" } satisfies AdminTokenPayload);
}

export function verifyAdminToken(token: string): AdminTokenPayload {
  const payload = verifyAuthToken(token);
  if (payload.role !== "ADMIN") {
    throw new AuthError("Invalid role");
  }
  return payload as AdminTokenPayload;
}

export function requireAdminFromHeaders(headers: { authorization?: string }) {
  return requireRoleFromHeaders(headers, "ADMIN");
}

export function validateAdminCredentials(username: string, password: string): boolean {
  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPass = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPass) {
    throw new Error("Admin credentials are not configured");
  }
  return username === expectedUser && password === expectedPass;
}

export { AuthError };
