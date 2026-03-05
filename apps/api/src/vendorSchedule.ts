export type VendorScheduleEntry = {
  weekday: "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
  openTime: string | null;
  closeTime: string | null;
  closed: boolean;
  is24h: boolean;
};

export type VendorScheduleInfo = {
  isOpenNow: boolean;
  nextOpenAt: Date | null;
};

const WEEKDAY_ORDER: VendorScheduleEntry["weekday"][] = [
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
  "SUN",
];

function parseTime(value: string | null) {
  if (!value) return null;
  const [hh, mm] = value.split(":").map((part) => Number(part));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm;
}

function getLocalParts(now: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const map = new Map(parts.map((part) => [part.type, part.value]));
  const weekdayLabel = map.get("weekday") ?? "Mon";
  const hour = Number(map.get("hour") ?? 0);
  const minute = Number(map.get("minute") ?? 0);
  return {
    weekday: mapWeekday(weekdayLabel),
    minutes: hour * 60 + minute,
  };
}

function mapWeekday(label: string): VendorScheduleEntry["weekday"] {
  const normalized = label.toLowerCase();
  if (normalized.startsWith("mon")) return "MON";
  if (normalized.startsWith("tue")) return "TUE";
  if (normalized.startsWith("wed")) return "WED";
  if (normalized.startsWith("thu")) return "THU";
  if (normalized.startsWith("fri")) return "FRI";
  if (normalized.startsWith("sat")) return "SAT";
  return "SUN";
}

function isOpenForEntry(entry: VendorScheduleEntry, minutes: number) {
  if (entry.closed) return false;
  if (entry.is24h) return true;
  const openMinutes = parseTime(entry.openTime);
  const closeMinutes = parseTime(entry.closeTime);
  if (openMinutes === null || closeMinutes === null) return false;
  if (openMinutes === closeMinutes) return true;
  if (openMinutes < closeMinutes) {
    return minutes >= openMinutes && minutes < closeMinutes;
  }
  return minutes >= openMinutes || minutes < closeMinutes;
}

function buildDateForTimezone(
  reference: Date,
  timezone: string,
  weekdayIndex: number,
  minutes: number,
) {
  const nowInTz = new Date(reference.toLocaleString("en-US", { timeZone: timezone }));
  const currentIndex = (nowInTz.getDay() + 6) % 7; // Monday=0
  let dayOffset = weekdayIndex - currentIndex;
  if (dayOffset < 0) dayOffset += 7;
  const result = new Date(nowInTz);
  result.setDate(nowInTz.getDate() + dayOffset);
  result.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return result;
}

export function computeVendorScheduleInfo(
  schedule: VendorScheduleEntry[],
  timezone: string,
  now: Date = new Date(),
): VendorScheduleInfo {
  if (!schedule || schedule.length === 0) {
    return { isOpenNow: true, nextOpenAt: null };
  }

  const { weekday, minutes } = getLocalParts(now, timezone);
  const today = schedule.find((entry) => entry.weekday === weekday);
  const isOpenNow = today ? isOpenForEntry(today, minutes) : false;

  if (isOpenNow) {
    return { isOpenNow: true, nextOpenAt: null };
  }

  const nextOpenAt = schedule
    .map((entry) => {
      if (entry.closed || entry.is24h) return null;
      const openMinutes = parseTime(entry.openTime);
      if (openMinutes === null) return null;
      const weekdayIndex = WEEKDAY_ORDER.indexOf(entry.weekday);
      if (weekdayIndex === -1) return null;
      return buildDateForTimezone(now, timezone, weekdayIndex, openMinutes);
    })
    .filter((value): value is Date => Boolean(value))
    .sort((a, b) => a.getTime() - b.getTime())
    .find((date) => date.getTime() > now.getTime());

  return { isOpenNow: false, nextOpenAt: nextOpenAt ?? null };
}
