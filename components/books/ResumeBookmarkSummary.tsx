"use client";

import { useResumeBookmark } from "@/lib/books/useResumeBookmark";
import { resumeBookmarkLabel } from "@/lib/books/resumeBookmark.mjs";
import type { ReactNode } from "react";

export default function ResumeBookmarkSummary({ userBookId, enabled = true, fallback = null }: { userBookId: string; enabled?: boolean; fallback?: ReactNode }) {
  const state = useResumeBookmark(userBookId, enabled);
  if (!state.available || !state.eligible || !state.bookmark) return fallback;
  return (
    <div className="rounded-xl border border-[var(--appearance-border)] bg-[var(--appearance-surface)] px-4 py-3 text-sm text-[var(--appearance-text)] shadow-sm" role="status" aria-label="Saved reading bookmark">
      <span className="font-semibold">Where Did I Leave Off?</span>{" "}
      {resumeBookmarkLabel(state.bookmark, state.pageCount)}
    </div>
  );
}
