// Time zone helpers

export const DEFAULT_APP_TIME_ZONE = "Asia/Tokyo";

export function ymdInTimeZone(date = new Date(), timeZone = DEFAULT_APP_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

export function todayYmdAppTimeZone() {
  return ymdInTimeZone(new Date(), DEFAULT_APP_TIME_ZONE);
}