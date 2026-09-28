"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useBookProgress } from "./BookProgressProvider";
import { summarizeBookProgress } from "@/lib/books/bookProgressSummary";
import BookHubProgressSummary from "@/app/(protected)/books/[userBookId]/components/BookHubProgressSummary";

export default function BookProgressSummaryBar({ userBookId, showVocabulary = true, listening = false, showBackLink = false }: { userBookId: string; showVocabulary?: boolean; listening?: boolean; showBackLink?: boolean }) {
  const tracking = useBookProgress();
  const { refreshSummary } = tracking;
  const matchesBook = tracking.userBookId === userBookId;
  useEffect(() => {
    if (!matchesBook) return;
    void refreshSummary();
    const refresh = () => { void refreshSummary(); };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [matchesBook, refreshSummary]);
  if (!matchesBook) return null;
  const summary = tracking.summaryData && tracking.loaded
    ? summarizeBookProgress(tracking.summaryData, tracking.method, tracking.totals, showVocabulary, listening) : null;
  return <div>
    {showBackLink ? <Link href={`/books/${encodeURIComponent(userBookId)}`} className="mb-3 inline-flex text-sm font-semibold text-slate-500 hover:text-slate-900">
      ← Back to Book Hub
    </Link> : null}
    {summary ? <BookHubProgressSummary
      {...summary} progressLabel="" progressBarWidth="0%" daysEngagedLabel=""
      savedWordsPerPageLabel="" averageMinutesPerPageLabel="" showProgressSection={false}
    /> : <div className="mb-3 rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-700 shadow-sm sm:px-5">
      <div className="font-semibold text-stone-900">Your Progress</div>
      {!tracking.summaryError ? <p role="status" className="text-stone-500">Loading progress…</p> : null}
    </div>}
    {tracking.summaryError ? <p role="alert" className="mb-3 text-xs text-amber-800">{tracking.summaryError} <button type="button" className="underline" onClick={() => void refreshSummary()}>Retry</button></p> : null}
  </div>;
}
