import crypto from "crypto";

export type HashedCode = {
  hash: string;
  salt: string;
};

export function generateNumericCode(length = 4): string {
  const max = 10 ** length;
  const value = crypto.randomInt(0, max);
  return value.toString().padStart(length, "0");
}

export function hashCode(code: string): HashedCode {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(code, salt, 64).toString("hex");
  return { hash, salt };
}

export function verifyCode(code: string, hash: string, salt: string): boolean {
  const computed = crypto.scryptSync(code, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(hash, "hex"));
}
