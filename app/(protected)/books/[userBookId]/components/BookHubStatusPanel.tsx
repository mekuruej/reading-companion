import { useState } from "react";
import { DNF_REASON_OPTIONS, type DnfDetails } from "@/lib/books/dnf";
import { ProgressTrackingSettings } from "@/components/books/BookProgressProvider";
import {
  PERSONAL_TRACKING_STATUSES,
  type PersonalTrackingStatus,
  personalTrackingStatusLabel,
} from "@/lib/personalTracking";

type BookHubStatusPanelProps = {
  personalTrackingStatus: PersonalTrackingStatus;
  showNotTrackingOption: boolean;
  isSavingStatus: boolean;
  statusError: string | null;
  startedAt: string;
  finishedAt: string;
  dnfAt: string;
  dnfReason: string;
  dnfNote: string;
  wouldRetry: string;

  showStartButton: boolean;
  showReflectionLink: boolean;
  showReviewLink: boolean;
  reviewLinkLabel: string;

  shouldNudgeStartBook: boolean;

  canFillBeginningPages: boolean;
  canFillEndingPages: boolean;
  earliestTrackedStartPage: number | null;
  furthestTrackedPage: number | null;
  pageCount: number | null;
  progressPercent: number | null;


  onSaveDnf: (details: DnfDetails) => Promise<boolean>;
  onStartToday: () => void;
  onPersonalTrackingStatusChange: (value: PersonalTrackingStatus) => void;
  onOpenReview: () => void;
  onOpenReflection: () => void;
  onFillBeginningPages: () => void;
  onFillEndingPages: () => void;
};

function dnfReasonLabel(value: string) {
  return DNF_REASON_OPTIONS.find(option => option.value === value)?.label ?? "";
}

function wouldRetryLabel(value: string) {
  switch (value) {
    case "yes":
      return "Yes";
    case "maybe":
      return "Maybe later";
    case "no":
      return "No";
    default:
      return "";
  }
}

export default function BookHubStatusPanel({
  personalTrackingStatus,
  showNotTrackingOption,
  isSavingStatus,
  statusError,
  startedAt,
  finishedAt,
  dnfAt,
  dnfReason,
  dnfNote,
  wouldRetry,
  showStartButton,
  showReflectionLink,
  showReviewLink,
  reviewLinkLabel,
  shouldNudgeStartBook,
  canFillBeginningPages,
  canFillEndingPages,
  earliestTrackedStartPage,
  furthestTrackedPage,
  pageCount,
  progressPercent,
  onSaveDnf,
  onStartToday,
  onPersonalTrackingStatusChange,
  onOpenReview,
  onOpenReflection,
  onFillBeginningPages,
  onFillEndingPages,
}: BookHubStatusPanelProps) {
  const [dnfPromptOpen, setDnfPromptOpen] = useState(false);
  const [reasonDraft, setReasonDraft] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [dnfSaving, setDnfSaving] = useState(false);
  const [dnfError, setDnfError] = useState<string | null>(null);
  const busy = isSavingStatus || dnfSaving;

  function selectStatus(value: PersonalTrackingStatus) {
    if (value === "dnf" && personalTrackingStatus !== "dnf") {
      setReasonDraft(dnfReason);
      setNoteDraft(dnfNote);
      setDnfError(null);
      setDnfPromptOpen(true);
      return;
    }
    setDnfPromptOpen(false);
    onPersonalTrackingStatusChange(value);
  }

  async function saveDnf() {
    if (busy) return;
    setDnfSaving(true);
    setDnfError(null);
    try {
      if (await onSaveDnf({ reason: reasonDraft, note: noteDraft })) setDnfPromptOpen(false);
    } catch {
      setDnfError("Could not save DNF. Please try again.");
    } finally {
      setDnfSaving(false);
    }
  }

  const shouldNudgeFinishBook =
    !finishedAt &&
    !dnfAt &&
    personalTrackingStatus !== "finished" &&
    personalTrackingStatus !== "dnf" &&
    personalTrackingStatus !== "not_tracking" &&
    progressPercent != null &&
    progressPercent >= 100;

  return (
    <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-100 via-purple-50 to-amber-50 p-4 shadow-[0_3px_14px_rgba(41,37,36,0.12)]">
      <div className="mb-3 text-sm font-semibold text-stone-900">
        Book Status
      </div>

      <div className="space-y-2 text-sm text-stone-700">
        <label className="block">
          <span className="mb-1 block font-medium">Reading Status</span>
          <select
            value={dnfPromptOpen ? "dnf" : personalTrackingStatus}
            onChange={(event) =>
              selectStatus(event.target.value as PersonalTrackingStatus)
            }
            disabled={busy}
            className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm font-semibold text-stone-800 shadow-sm"
          >
            {showNotTrackingOption ? (
            <optgroup label={personalTrackingStatus === "not_tracking" ? "Move to My Library (track personal stats)" : "My Library (track personal stats)"}>
              {PERSONAL_TRACKING_STATUSES.filter(status => status !== "not_tracking").map(status => (
                <option key={status} value={status}>{personalTrackingStatusLabel(status)}</option>
              ))}
            </optgroup>
            ) : PERSONAL_TRACKING_STATUSES.filter(status => status !== "not_tracking").map(status => (
              <option key={status} value={status}>{personalTrackingStatusLabel(status)}</option>
            ))}
            {showNotTrackingOption ? (
              <option value="not_tracking">Teaching Only (no personal stats)</option>
            ) : null}
          </select>
          {isSavingStatus ? (
            <span className="mt-1 block text-xs font-semibold text-violet-700">Saving...</span>
          ) : null}
          {statusError ? (
            <span className="mt-1 block text-xs font-semibold text-red-700">{statusError}</span>
          ) : null}
        </label>
        {dnfPromptOpen ? (
          <section aria-label="DNF reason" className="rounded-xl border border-violet-200 bg-white p-3">
            <label className="block text-sm font-semibold text-stone-900">
              Why did you stop reading?
              <select autoFocus value={reasonDraft} onChange={event => setReasonDraft(event.target.value)} disabled={busy}
                className="mt-2 w-full min-w-0 rounded-lg border border-stone-300 bg-white px-2 py-2 text-sm font-normal">
                {DNF_REASON_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <details className="mt-2" open={noteDraft ? true : undefined}>
              <summary className="cursor-pointer text-xs font-medium text-stone-600">Add a note (optional)</summary>
              <textarea aria-label="DNF note" value={noteDraft} onChange={event => setNoteDraft(event.target.value)} disabled={busy}
                rows={2} className="mt-2 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm" />
            </details>
            {dnfError ? <p role="alert" className="mt-2 text-xs text-red-700">{dnfError}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => void saveDnf()} disabled={busy}
                className="rounded-lg bg-violet-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving..." : "Save DNF"}</button>
              <button type="button" onClick={() => setDnfPromptOpen(false)} disabled={busy}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium disabled:opacity-50">Cancel</button>
            </div>
          </section>
        ) : <ProgressTrackingSettings readingStatus={personalTrackingStatus} />}
        <div>
          <span className="font-medium">Started:</span> {startedAt || "—"}
        </div>
        <div>
          <span className="font-medium">Finished:</span> {finishedAt || "—"}
        </div>
        <div>
          <span className="font-medium">DNF:</span> {dnfAt || "—"}
        </div>
      </div>

      {shouldNudgeFinishBook ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-950">
            You’ve logged the end of this copy! Mark the book as finished to complete it.
          </p>
          <button
            type="button"
            onClick={() => onPersonalTrackingStatusChange("finished")}
            disabled={busy}
            className="mt-3 rounded-2xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 motion-safe:animate-pulse disabled:animate-none disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSavingStatus ? "Saving..." : "Finish book"}
          </button>
        </div>
      ) : null}

      {dnfAt && (dnfReason || dnfNote || wouldRetry) ? (
        <div className="mt-3 rounded-2xl border border-violet-100 bg-white/70 p-3 text-sm text-stone-700">
          <div className="font-semibold text-stone-900">DNF details</div>
          {dnfReason ? (
            <div className="mt-2">
              <span className="font-medium">Reason:</span> {dnfReasonLabel(dnfReason)}
            </div>
          ) : null}
          {wouldRetry ? (
            <div className="mt-1">
              <span className="font-medium">Try again:</span> {wouldRetryLabel(wouldRetry)}
            </div>
          ) : null}
          {dnfNote ? (
            <div className="mt-1">
              <span className="font-medium">Note:</span> {dnfNote}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {showStartButton ? (
          <button
            type="button"
            onClick={onStartToday}
            disabled={busy}
            className={`rounded-2xl border px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-200 ${
              isSavingStatus
                ? "cursor-not-allowed border-stone-300 bg-stone-100 opacity-60"
                : shouldNudgeStartBook
                ? "animate-pulse border-emerald-300 bg-emerald-100 shadow-sm shadow-emerald-100"
                : "border-stone-400 bg-stone-100"
            }`}
          >
            Start Today
          </button>
        ) : null}

        {showReviewLink ? (
          <button
            type="button"
            onClick={onOpenReview}
            className="rounded-2xl border border-purple-700 bg-purple-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:border-purple-800 hover:bg-purple-800"
          >
            {reviewLinkLabel}
          </button>
        ) : null}

        <p className="mt-2 text-xs text-stone-500">
          You can edit these in the Reading History card.
        </p>
      </div>

      {showReflectionLink ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="text-sm font-semibold text-amber-950">
            Finished! Your Reading Reflection is ready.
          </div>
          <button
            type="button"
            onClick={onOpenReflection}
            className="mt-3 rounded-2xl bg-amber-500 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-amber-600"
          >
            Go to Reading Reflection ↓
          </button>
        </div>
      ) : null}

      {canFillBeginningPages || canFillEndingPages ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {canFillBeginningPages ? (
            <button
              type="button"
              onClick={onFillBeginningPages}
              className="rounded-2xl border px-4 py-2 text-sm font-medium text-stone-700 hover:bg-white"
            >
              Fill beginning pages
            </button>
          ) : null}

          {canFillEndingPages ? (
            <button
              type="button"
              onClick={onFillEndingPages}
              className="rounded-2xl border px-4 py-2 text-sm font-medium text-stone-700 hover:bg-white"
            >
              Fill ending pages
            </button>
          ) : null}
        </div>
      ) : null}

      {canFillBeginningPages && earliestTrackedStartPage != null ? (
        <div className="mt-2 text-xs text-stone-500">
          Looks like you started logging on page {earliestTrackedStartPage}.
          Fill pages 1–{earliestTrackedStartPage - 1}?
        </div>
      ) : null}

      {canFillEndingPages && furthestTrackedPage != null && pageCount != null ? (
        <div className="mt-2 text-xs text-stone-500">
          Looks like your story ended on page {furthestTrackedPage}. Fill pages{" "}
          {furthestTrackedPage + 1}–{pageCount}?
        </div>
      ) : null}
    </div>
  );
}
