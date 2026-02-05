import { AuthPayload, AuthContext, Role } from "./types";
import { AuthError, signAuthToken, verifyAuthToken } from "./jwt";

export { AuthError, signAuthToken, verifyAuthToken };
export type { AuthPayload, AuthContext, Role };

export function getAuthFromHeaders(headers: {
  authorization?: string;
}): AuthContext | null {
  const raw = headers.authorization;
  if (!raw?.startsWith("Bearer ")) {
    return null;
  }
  const token = raw.slice("Bearer ".length).trim();
  try {
    const payload = verifyAuthToken(token);
    return { ...payload, token };
  } catch {
    return null;
  }
}

export function requireRoleFromHeaders(
  headers: { authorization?: string },
  role: Role,
): AuthPayload {
  const auth = getAuthFromHeaders(headers);
  if (!auth) {
    throw new AuthError("missing token");
  }
  if (auth.role !== role) {
    throw new AuthError("forbidden");
  }
  return auth;
}
