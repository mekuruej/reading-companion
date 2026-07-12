export function normalizeBookPart(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeIsbn(isbn: string | null | undefined) {
  return (isbn ?? "").replace(/[^0-9X]/gi, "");
}

export function makeBookKey(title: string, author?: string | null) {
  return [normalizeBookPart(title), normalizeBookPart(author)].join("|");
}

type MonthOption = {
  value: string;
  label: string;
};

export function ymdInTimeZone(value: string | Date, timeZone: string) {
  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;

  if (!year || !month || !day) return null;

  return `${year}-${month}-${day}`;
}

export function ymdToDayNumber(ymd: string) {
  const [year, month, day] = ymd.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

export function getMonthOptions(count = 12): MonthOption[] {
  const opts: MonthOption[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "long" });
    opts.push({ value, label });
  }

  return opts;
}

export function getMonthRange(monthValue: string) {
  if (monthValue.startsWith("year-")) {
    const year = Number(monthValue.replace("year-", ""));
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);

    const startStr = `${start.getFullYear()}-01-01`;
    const endStr = `${end.getFullYear()}-01-01`;

    return { startStr, endStr };
  }

  const [year, month] = monthValue.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-01`;
  const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-01`;

  return { startStr, endStr };
}

export function formatMinutesAsReadableTime(totalMinutes: number) {
  if (!totalMinutes || totalMinutes <= 0) return "—";

  if (totalMinutes < 60) return `${totalMinutes} min`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
}

export function formatRelativeDate(dateStr: string) {
  const dateKey =
    /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
      ? dateStr
      : ymdInTimeZone(dateStr, "Asia/Tokyo");
  const todayKey = ymdInTimeZone(new Date(), "Asia/Tokyo");

  if (!dateKey || !todayKey) return dateStr;

  const diffDays = ymdToDayNumber(todayKey) - ymdToDayNumber(dateKey);

  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

  return dateKey;
}

const ABILITY_CHECK_SEEN_STORAGE_KEY = "library-study-seen-by-date";
const ABILITY_CHECK_REMINDER_HIDE_KEY = "ability-check-reminder-hidden-date";
const ABILITY_CHECK_REMINDER_UNLOCKED_KEY = "ability-check-reminder-unlocked";
const PENDING_BOOK_REQUESTS_ALERT_HIDE_KEY =
  "pending-book-requests-alert-hidden-signature";

export function getTodayKey() {
  return ymdInTimeZone(new Date(), "Asia/Tokyo") ?? new Date().toISOString().slice(0, 10);
}

export function loadAbilityCheckSeenForToday() {
  if (typeof window === "undefined") return new Set<string>();

  try {
    const raw = window.localStorage.getItem(ABILITY_CHECK_SEEN_STORAGE_KEY);
    if (!raw) return new Set<string>();

    const parsed = JSON.parse(raw) as Record<string, string[]>;
    return new Set(parsed[getTodayKey()] ?? []);
  } catch {
    return new Set<string>();
  }
}

export function abilityCheckReminderHiddenToday() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ABILITY_CHECK_REMINDER_HIDE_KEY) === getTodayKey();
}

export function abilityCheckReminderUnlocked() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ABILITY_CHECK_REMINDER_UNLOCKED_KEY) === "true";
}

export function unlockAbilityCheckReminder() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ABILITY_CHECK_REMINDER_UNLOCKED_KEY, "true");
}

export function hideAbilityCheckReminderForToday() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ABILITY_CHECK_REMINDER_HIDE_KEY, getTodayKey());
}

export function pendingBookRequestsSignature(
  requests: Array<{ id?: string | null }>
) {
  return requests
    .map((request) => request.id)
    .filter(Boolean)
    .sort()
    .join("|");
}

export function pendingBookRequestsAlertHidden(signature: string) {
  if (typeof window === "undefined" || !signature) return false;
  return window.localStorage.getItem(PENDING_BOOK_REQUESTS_ALERT_HIDE_KEY) === signature;
}

export function hidePendingBookRequestsAlert(signature: string) {
  if (typeof window === "undefined" || !signature) return;
  window.localStorage.setItem(PENDING_BOOK_REQUESTS_ALERT_HIDE_KEY, signature);
}


export function isListeningFormat(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();

  return (
    normalized === "listening" ||
    normalized === "audiobook" ||
    normalized.includes("audio")
  );
}

export function dateFromYmd(value: string) {
  return new Date(`${value}T00:00:00`);
}
