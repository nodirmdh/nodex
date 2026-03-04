export type TelegramUser = {
  id: number | string;
  first_name?: string;
  last_name?: string;
  username?: string;
  name: string | null;
};

export class VerifyInitDataError extends Error {}
