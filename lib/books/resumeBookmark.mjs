/** @typedef {"top" | "end" | "phrase"} ResumeBookmarkKind */
/** @typedef {{ kind: ResumeBookmarkKind, page: number, phrase: string | null }} ResumeBookmark */

/**
 * @param {ResumeBookmarkKind} kind
 * @param {number} endingPage
 * @param {number | null} pageCount
 * @param {string | null | undefined} phrase
 * @returns {ResumeBookmark | null}
 */
export function resolveResumeBookmark(kind, endingPage, pageCount, phrase) {
  if (!Number.isSafeInteger(endingPage) || endingPage < 0) return null;
  if (pageCount != null && (!Number.isSafeInteger(pageCount) || pageCount <= 0 || endingPage > pageCount)) return null;

  if (kind === "phrase") {
    const normalizedPhrase = phrase?.trim() ?? "";
    if (!normalizedPhrase || normalizedPhrase.length > 500) return null;
    return { kind, page: endingPage, phrase: normalizedPhrase };
  }

  if (kind === "top") return { kind, page: endingPage, phrase: null };

  if (kind !== "end") return null;
  const nextPage = endingPage + 1;
  return {
    // Only a stop on the actual last page is an end-of-book bookmark.
    kind: pageCount != null && endingPage === pageCount ? "end" : "top",
    page: pageCount == null ? nextPage : Math.min(nextPage, pageCount),
    phrase: null,
  };
}

/** @param {ResumeBookmark} bookmark @param {number | null} pageCount */
export function resumeBookmarkLabel(bookmark, pageCount) {
  if (bookmark.kind === "phrase") {
    return `Resume from 「${bookmark.phrase}」 on page ${bookmark.page}`;
  }
  if (bookmark.kind === "end" && pageCount != null && bookmark.page === pageCount) {
    return `Resume at the end of page ${bookmark.page}`;
  }
  if (bookmark.kind === "top") {
    return `Resume from page ${bookmark.page} (top of page)`;
  }
  return `Resume from page ${bookmark.page}`;
}

/** The newest session owns its phrase, including an intentionally blank phrase.
 * @param {{read_on?: string|null, created_at?: string|null, id?: string|number, ending_phrase?: string|null}[]} sessions
 */
export function latestSessionPhrase(sessions) {
  const latest = [...sessions].sort((a, b) => String(b.read_on ?? "").localeCompare(String(a.read_on ?? "")) || String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")) || String(b.id ?? "").localeCompare(String(a.id ?? "")))[0];
  return latest?.ending_phrase?.trim() || undefined;
}
