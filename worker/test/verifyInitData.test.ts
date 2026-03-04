import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { verifyTelegramInitData } from "../src/telegram/verifyInitData";
import { VerifyInitDataError } from "../src/telegram/types";

type BuildParams = {
  botToken: string;
  authDate: number;
  user: {
    id: number;
    first_name: string;
    username: string;
  };
  queryId?: string;
};

function buildInitData(params: BuildParams): string {
  const queryId = params.queryId ?? "AAEAAAE";
  const payload = new URLSearchParams();
  payload.set("auth_date", String(params.authDate));
  payload.set("query_id", queryId);
  payload.set("user", JSON.stringify(params.user));

  const lines: string[] = [];
  payload.forEach((value, key) => {
    lines.push(`${key}=${value}`);
  });
  lines.sort((a, b) => a.localeCompare(b));
  const dataCheckString = lines.join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(params.botToken).digest();
  const hash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  payload.set("hash", hash);
  return payload.toString();
}

describe("verifyTelegramInitData", () => {
  const botToken = "123456:TEST_CLIENT_BOT_TOKEN";
  const nowSec = 1_710_000_000;

  it("valid initData passes", async () => {
    const initData = buildInitData({
      botToken,
      authDate: nowSec - 10,
      user: {
        id: 123456789,
        first_name: "Alice",
        username: "alice",
      },
    });

    const user = await verifyTelegramInitData(initData, botToken, 60, nowSec);

    expect(user.id).toBe(123456789);
    expect(user.name).toBe("Alice");
  });

  it("tampered field fails", async () => {
    const signed = buildInitData({
      botToken,
      authDate: nowSec - 10,
      user: {
        id: 123456789,
        first_name: "Alice",
        username: "alice",
      },
      queryId: "AAEAAAE",
    });

    const tampered = new URLSearchParams(signed);
    tampered.set("query_id", "AAEAAAF");

    await expect(
      verifyTelegramInitData(tampered.toString(), botToken, 60, nowSec),
    ).rejects.toBeInstanceOf(VerifyInitDataError);
  });

  it("wrong bot token fails", async () => {
    const initData = buildInitData({
      botToken,
      authDate: nowSec - 10,
      user: {
        id: 123456789,
        first_name: "Alice",
        username: "alice",
      },
    });

    await expect(
      verifyTelegramInitData(initData, "123456:WRONG_TOKEN", 60, nowSec),
    ).rejects.toBeInstanceOf(VerifyInitDataError);
  });

  it("expired auth_date fails", async () => {
    const initData = buildInitData({
      botToken,
      authDate: nowSec - 1_000,
      user: {
        id: 123456789,
        first_name: "Alice",
        username: "alice",
      },
    });

    await expect(
      verifyTelegramInitData(initData, botToken, 60, nowSec),
    ).rejects.toBeInstanceOf(VerifyInitDataError);
  });
});
