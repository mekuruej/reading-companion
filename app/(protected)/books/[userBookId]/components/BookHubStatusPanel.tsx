type BookHubStatusPanelProps = {
  statusLabel: string;
  startedAt: string;
  finishedAt: string;
  dnfAt: string;
  dnfReason: string;
  dnfNote: string;
  wouldRetry: string;

  showStartButton: boolean;
  showFinishDnfButtons: boolean;
  showReflectionPrompt: boolean;

  shouldNudgeStartBook: boolean;
  shouldNudgeFinishBook: boolean;

  canFillBeginningPages: boolean;
  canFillEndingPages: boolean;
  earliestTrackedStartPage: number | null;
  furthestTrackedPage: number | null;
  pageCount: number | null;

  canRemoveFromMyLibrary: boolean;

  onStartToday: () => void;
  onMarkFinished: () => void;
  onMarkDnf: () => void;
  onOpenReflection: () => void;
  onFillBeginningPages: () => void;
  onFillEndingPages: () => void;
  onRemoveFromLibrary: () => void;
};

function dnfReasonLabel(value: string) {
  switch (value) {
    case "too_difficult_right_now":
      return "Too difficult right now";
    case "wrong_timing_mood":
      return "Wrong timing or mood";
    case "too_much_unknown_vocabulary":
      return "Too much unknown vocabulary";
    case "too_dense_slow":
      return "Too dense or slow";
    case "lost_interest":
      return "Lost interest";
    case "did_not_like_it":
      return "Did not like it";
    case "other":
      return "Other";
    default:
      return "";
  }
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
  statusLabel,
  startedAt,
  finishedAt,
  dnfAt,
  dnfReason,
  dnfNote,
  wouldRetry,
  showStartButton,
  showFinishDnfButtons,
  showReflectionPrompt,
  shouldNudgeStartBook,
  shouldNudgeFinishBook,
  canFillBeginningPages,
  canFillEndingPages,
  earliestTrackedStartPage,
  furthestTrackedPage,
  pageCount,
  canRemoveFromMyLibrary,
  onStartToday,
  onMarkFinished,
  onMarkDnf,
  onOpenReflection,
  onFillBeginningPages,
  onFillEndingPages,
  onRemoveFromLibrary,
}: BookHubStatusPanelProps) {
  return (
    <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
      <div className="mb-3 text-sm font-semibold text-stone-900">
        Book Status
      </div>

      <div className="space-y-2 text-sm text-stone-700">
        <div>
          <span className="font-medium">Status:</span> {statusLabel}
        </div>
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
            className={`rounded-2xl border px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-200 ${
              shouldNudgeStartBook
                ? "animate-pulse border-emerald-300 bg-emerald-100 shadow-sm shadow-emerald-100"
                : "border-stone-400 bg-stone-100"
            }`}
          >
            Start Today
          </button>
        ) : null}

        {showFinishDnfButtons ? (
          <button
            type="button"
            onClick={onMarkFinished}
            className={`rounded-2xl border px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-200 ${
              shouldNudgeFinishBook
                ? "animate-pulse border-amber-300 bg-amber-100 shadow-sm shadow-amber-100"
                : "border-stone-400 bg-stone-100"
            }`}
          >
            Mark Finished
          </button>
        ) : null}

        {showFinishDnfButtons ? (
          <button
            type="button"
            onClick={onMarkDnf}
            className="rounded-2xl border border-stone-400 bg-stone-100 px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-200"
          >
            Mark DNF
          </button>
        ) : null}

        <p className="mt-2 text-xs text-stone-500">
          You can edit these in the Reading Tab.
        </p>
      </div>

      {showReflectionPrompt ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="text-sm font-semibold text-amber-950">
            Finished! Add a reflection while the book is fresh.
          </div>
          <button
            type="button"
            onClick={onOpenReflection}
            className="mt-3 rounded-2xl bg-amber-500 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-amber-600"
          >
            Go to Reading Reflection
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

      {canRemoveFromMyLibrary ? (
        <div className="mt-5 border-t border-violet-100 pt-4">
          <button
            type="button"
            onClick={onRemoveFromLibrary}
            className="rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50"
          >
            Remove from My Library
          </button>
        </div>
      ) : null}
    </div>
  );
}
