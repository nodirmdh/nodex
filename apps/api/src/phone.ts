export function normalizeUzPhone(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const digits = value.replace(/\D/g, "");
  if (!digits.startsWith("998")) {
    return null;
  }
  if (digits.length !== 12) {
    return null;
  }
  return `+${digits}`;
}
