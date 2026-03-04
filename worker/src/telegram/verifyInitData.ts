import { TelegramUser, VerifyInitDataError } from "./types";

export async function verifyTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSec: number,
  nowSec = Math.floor(Date.now() / 1000),
): Promise<TelegramUser> {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) {
    throw new VerifyInitDataError("initData missing hash");
  }

  const authDateRaw = params.get("auth_date");
  if (!authDateRaw) {
    throw new VerifyInitDataError("initData missing auth_date");
  }
  const authDate = Number(authDateRaw);
  if (!Number.isFinite(authDate)) {
    throw new VerifyInitDataError("initData invalid auth_date");
  }
  if (nowSec - authDate > maxAgeSec) {
    throw new VerifyInitDataError("initData expired");
  }

  const dataCheckEntries: string[] = [];
  params.forEach((value, key) => {
    if (key === "hash") {
      return;
    }
    dataCheckEntries.push(`${key}=${value}`);
  });
  dataCheckEntries.sort((a, b) => a.localeCompare(b));
  const dataCheckString = dataCheckEntries.join("\n");

  const secretKey = await hmacSha256(new TextEncoder().encode("WebAppData"), botToken);
  const calculatedHashHex = bytesToHex(await hmacSha256(secretKey, dataCheckString));

  if (!timingSafeEqualHex(calculatedHashHex, hash)) {
    throw new VerifyInitDataError("invalid initData signature");
  }

  const userRaw = params.get("user");
  if (!userRaw) {
    throw new VerifyInitDataError("initData missing user");
  }

  let parsed: { id?: number | string; first_name?: string; last_name?: string; username?: string };
  try {
    parsed = JSON.parse(userRaw);
  } catch {
    throw new VerifyInitDataError("initData invalid user json");
  }

  if (parsed.id === undefined || parsed.id === null) {
    throw new VerifyInitDataError("initData missing user.id");
  }

  const name = [parsed.first_name, parsed.last_name].filter(Boolean).join(" ") || parsed.username || null;

  return {
    id: parsed.id,
    first_name: parsed.first_name,
    last_name: parsed.last_name,
    username: parsed.username,
    name,
  };
}

async function hmacSha256(key: Uint8Array, data: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as unknown as BufferSource,
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );

  const signed = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
  return new Uint8Array(signed);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
