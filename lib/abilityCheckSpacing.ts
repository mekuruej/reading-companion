import { ymdInTimeZone } from "./timeZone";

// A Friday check rests on Saturday and Sunday; Monday is the earliest return.
export function hasAbilityCheckRestDays(lastStudiedAt: string | null | undefined, now = new Date()) {
  if (!lastStudiedAt) return true;
  const studied = new Date(lastStudiedAt);
  if (!Number.isFinite(studied.getTime())) return true;
  const dayNumber = (date: Date) => {
    const [year, month, day] = ymdInTimeZone(date).split("-").map(Number);
    return Date.UTC(year, month - 1, day) / 86400000;
  };
  return dayNumber(now) - dayNumber(studied) >= 3;
}
