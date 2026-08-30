export type ReturnToKey =
  | "advanced-study"
  | "book-flashcards"
  | "book-study"
  | "study-hub";

export type ReturnDestination = {
  href: string;
  label: string;
};

const RETURN_TO_DESTINATIONS: Record<ReturnToKey, ReturnDestination> = {
  "advanced-study": {
    href: "/library-study/advanced",
    label: "Back to Advanced Study",
  },
  "book-flashcards": {
    href: "/library-study/book-flashcards",
    label: "Back to Book Flashcards",
  },
  "book-study": {
    href: "/library-study/book-study",
    label: "Back to Book Study",
  },
  "study-hub": {
    href: "/library-study",
    label: "Back to Study Hub",
  },
};

export function resolveReturnTo(
  value: string | null | undefined,
  fallback: ReturnDestination
): ReturnDestination {
  if (!value) return fallback;

  return RETURN_TO_DESTINATIONS[value as ReturnToKey] ?? fallback;
}

export function withReturnTo(href: string, returnTo: ReturnToKey) {
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}returnTo=${encodeURIComponent(returnTo)}`;
}
