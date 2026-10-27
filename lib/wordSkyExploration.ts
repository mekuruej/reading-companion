import { BOOK_TYPE_OPTIONS } from "@/lib/books/bookTypes";

/** Recover legacy exploration links without retaining their former numeric goal. */
export function isWordSkyExploration(value: string | null) {
  return value === "1" || value === "5";
}

/** Only Library destinations are valid; normal route authorization still applies. */
export function getWordSkyExplorationReturnPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(value)) {
    return null;
  }
  try {
    const url = new URL(value, "https://mekuru.invalid");
    if (url.origin !== "https://mekuru.invalid") return null;
    if (/%(?![a-f\d]{2})/i.test(value)) return null;
    if (url.pathname !== "/books" && !/^\/users\/[^/]+\/books\/?$/.test(url.pathname)) return null;
    const decodedPath = decodeURIComponent(url.pathname);
    if (/[\\\u0000-\u0020\u007f]/.test(decodedPath)) return null;
    if (decodedPath !== "/books" && !/^\/users\/[^/]+\/books\/?$/.test(decodedPath)) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

/** Restore only supported viewing preferences; this does not affect Library access. */
export function getWordSkyLibraryReturnState(search: string) {
  const params = new URLSearchParams(search);
  if (params.get("wordSkyReturn") !== "1") return null;
  const bookType = params.get("bookType") ?? "all";
  const status = params.get("status") ?? "all";
  const sort = params.get("sort") ?? "status";
  const view = params.get("view") ?? "cover";
  return {
    search: params.get("search") ?? "",
    bookType: BOOK_TYPE_OPTIONS.some(option => option.value === bookType) ? bookType : "all",
    status: ["all", "reading", "want_to_read", "finished", "dnf"].includes(status) ? status : "all",
    sort: ["status", "title", "last_engaged", "rating_high", "difficulty_low"].includes(sort) ? sort : "status",
    view: view === "list" ? "list" as const : "cover" as const,
  };
}
