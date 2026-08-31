export type ParsedPageLocation = {
  value: number | null;
  kind: "page" | "percent" | null;
  error: string | null;
};

export function percentToPage(percent: number | null, pageCount: number | null) {
  if (percent == null || !pageCount || pageCount <= 0) return null;
  const clamped = Math.max(0, Math.min(100, percent));
  return Math.max(1, Math.min(pageCount, Math.round((clamped / 100) * pageCount)));
}

export function pageToPercent(page: number | null, pageCount: number | null) {
  if (page == null || !pageCount || pageCount <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((page / pageCount) * 100)));
}

export function parsePageLocationInput(
  value: string | number | null | undefined,
  pageCount: number | null | undefined,
  options: { required?: boolean; label?: string; allowZeroPercent?: boolean } = {}
): ParsedPageLocation {
  const label = options.label ?? "page";
  const trimmed = String(value ?? "").trim();

  if (!trimmed) {
    return options.required
      ? { value: null, kind: null, error: `Enter a ${label}.` }
      : { value: null, kind: null, error: null };
  }

  const isPercent = trimmed.includes("%");
  const normalized = trimmed
    .replace(/%/g, "")
    .replace(/^p(?:age)?\.?\s*/i, "")
    .trim();
  const numeric = Number(normalized);

  if (!Number.isFinite(numeric)) {
    return {
      value: null,
      kind: isPercent ? "percent" : "page",
      error: `Enter a page or percent, like 42, p. 42, or 18%.`,
    };
  }

  if (isPercent) {
    const min = options.allowZeroPercent ? 0 : Number.MIN_VALUE;
    if (numeric < min || numeric > 100) {
      return {
        value: null,
        kind: "percent",
        error: "Percent must be between 0 and 100.",
      };
    }

    const convertedPage = percentToPage(numeric, pageCount ?? null);
    if (convertedPage == null) {
      return {
        value: null,
        kind: "percent",
        error: "Percent needs a page count for this book.",
      };
    }

    return { value: convertedPage, kind: "percent", error: null };
  }

  if (numeric <= 0) {
    return { value: null, kind: "page", error: "Page must be 1 or higher." };
  }

  return { value: Math.round(numeric), kind: "page", error: null };
}

export function parseOptionalPageLocationInput(
  value: string | number | null | undefined,
  pageCount: number | null | undefined
) {
  return parsePageLocationInput(value, pageCount, { required: false });
}
