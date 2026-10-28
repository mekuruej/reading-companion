"use client";

import { useId } from "react";
import type { ResumeBookmarkKind } from "@/lib/books/resumeBookmark.mjs";

type Props = {
  available: boolean;
  endingPage: number | null;
  kind: ResumeBookmarkKind | null;
  phrase: string;
  onKindChange: (kind: ResumeBookmarkKind | null) => void;
  onPhraseChange: (phrase: string) => void;
};

const choices: { value: ResumeBookmarkKind; label: string }[] = [
  { value: "page", label: "No specific location" },
  { value: "top", label: "Top of page" },
  { value: "end", label: "End of page" },
  { value: "phrase", label: "Specific word or phrase" },
];

export default function ResumeBookmarkSection({ available, endingPage, kind, phrase, onKindChange, onPhraseChange }: Props) {
  const group = useId();
  if (!available) return null;
  return (
    <fieldset className="mt-4 rounded-xl border border-[var(--appearance-border)] bg-[var(--appearance-surface-muted)] text-[var(--appearance-text)] p-3">
      <legend className="px-1 text-sm font-semibold text-[var(--appearance-text)]">Where Did I Leave Off?</legend>
      <p className="mb-2 text-xs text-[var(--appearance-muted-text)]">The page number is your resume bookmark. Adding a specific location within the page is optional.</p>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {choices.map((choice) => (
          <label key={choice.value} className={`inline-flex items-center gap-2 text-sm ${endingPage == null ? "text-[var(--appearance-muted-text)] opacity-60" : "text-[var(--appearance-text)]"}`}>
            <input
              type="radio"
              name={group}
              value={choice.value}
              checked={kind === choice.value}
              disabled={endingPage == null}
              onChange={() => onKindChange(choice.value)}
              className="accent-[var(--appearance-accent)] focus-visible:outline-2 focus-visible:outline-offset-2"
            />
            {choice.label}
          </label>
        ))}
      </div>
      {endingPage == null ? <p className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--appearance-accent)] mt-2 text-xs text-[var(--appearance-muted-text)]">Enter a valid ending page to choose a bookmark.</p> : null}
      {kind === "phrase" ? (
        <label className="mt-3 block text-sm text-[var(--appearance-text)]">
          Phrase on page {endingPage ?? "—"}
          <input
            type="text"
            maxLength={500}
            value={phrase}
            onChange={(event) => onPhraseChange(event.target.value)}
            placeholder="A Japanese or English word or phrase"
            className="mt-1 w-full rounded-lg border border-[var(--appearance-border)] bg-[var(--appearance-surface)] text-[var(--appearance-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--appearance-accent)] px-3 py-2 text-sm"
          />
        </label>
      ) : null}
    </fieldset>
  );
}

// A failed bookmark write can be retried independently after the session form closes.
export function ResumeBookmarkFeedback({ bookmark }: { bookmark: { canRetry: boolean; error: string | null; choice: ResumeBookmarkKind | null; phrase: string; retry: () => Promise<unknown>; skip: () => void; retryEndingPage: number | null; setChoice: (kind: ResumeBookmarkKind | null) => void; setPhrase: (phrase: string) => void } }) {
  if (!bookmark.canRetry) return null;
  return <div role="alert" className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
    <p>The session was saved, but its bookmark was not. {bookmark.error}</p>
    <p className="break-words">Unsaved bookmark: {choices.find(choice => choice.value === bookmark.choice)?.label}{bookmark.choice === "phrase" ? ` — ${bookmark.phrase}` : ""}</p>
    <ResumeBookmarkSection available endingPage={bookmark.retryEndingPage} kind={bookmark.choice} phrase={bookmark.phrase} onKindChange={bookmark.setChoice} onPhraseChange={bookmark.setPhrase} />
    <div className="mt-2 flex flex-wrap gap-3">
      <button type="button" className="underline focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => void bookmark.retry()}>Retry bookmark only</button>
    </div>
  </div>;
}
