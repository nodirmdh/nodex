type TelegramWebApp = {
  initData?: string;
  ready?: () => void;
};

export function getTelegramWebApp(): TelegramWebApp | null {
  const tg = (window as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp;
  return tg ?? null;
}

export function getTelegramInitData(): string | null {
  return getTelegramWebApp()?.initData ?? null;
}

export function parseTelegramUserId(initData: string | null): string | null {
  if (!initData) {
    return null;
  }
  const params = new URLSearchParams(initData);
  const userRaw = params.get("user");
  if (!userRaw) {
    return null;
  }
  try {
    const user = JSON.parse(userRaw) as { id?: number | string };
    if (user?.id !== undefined && user?.id !== null) {
      return `tg:${user.id}`;
    }
  } catch {
    return null;
  }
  return null;
}
