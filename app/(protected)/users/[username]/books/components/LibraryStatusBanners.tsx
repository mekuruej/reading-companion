import LibraryReminderBanner from "./LibraryReminderBanner";

export function AbilityCheckReminderBanner({
  abilityCheckReminderCount,
  minDueCards,
  onStart,
  onHide,
}: {
  abilityCheckReminderCount: number;
  minDueCards: number;
  onStart: () => void;
  onHide: () => void;
}) {
  const isReady = abilityCheckReminderCount >= minDueCards;

  return (
    <LibraryReminderBanner
      tone={isReady ? "emerald" : "sky"}
      title={isReady ? "Your Ability Check is ready!" : "Ability Check is resting today"}
      actions={
        <>
          {isReady ? (
            <button
              type="button"
              onClick={onStart}
              className="animate-pulse rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white shadow-sm shadow-emerald-300 transition hover:bg-emerald-600"
            >
              Start now
            </button>
          ) : null}

          <button
            type="button"
            onClick={onHide}
            className={`rounded-xl border bg-white px-4 py-2 text-sm font-semibold transition ${
              isReady
                ? "border-emerald-200 text-emerald-900 hover:bg-emerald-100"
                : "border-sky-200 text-sky-900 hover:bg-sky-100"
            }`}
          >
            Hide today
          </button>
        </>
      }
    >
      {isReady ? (
        <div className="mt-1 space-y-1">
          <p className="text-xl font-black leading-tight text-emerald-950">
            Time to test your reading and meaning knowledge.
          </p>
          <p className="text-sm leading-6 text-emerald-900">
            These words are nearing mastery and ready to check.
          </p>
        </div>
      ) : (
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Ability Check opens when at least {minDueCards} cards are due. You
          have{" "}
          <span className="text-xl font-black text-slate-950">
            {abilityCheckReminderCount}
          </span>{" "}
          due right now.
        </p>
      )}
    </LibraryReminderBanner>
  );
}

export function NeedsAttentionReminderBanner({
  onOpen,
  onHide,
}: {
  onOpen: () => void;
  onHide: () => void;
}) {
  return (
    <LibraryReminderBanner
      tone="violet"
      title="Needs Attention"
      actions={
        <>
          <button
            type="button"
            onClick={onOpen}
            className="rounded-xl bg-violet-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-800"
          >
            Open Needs Attention
          </button>

          <button
            type="button"
            onClick={onHide}
            className="rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-900 transition hover:bg-violet-100"
          >
            Hide today
          </button>
        </>
      }
    >
      <p className="mt-1 text-sm leading-6 text-slate-600">
        Something in the teacher review workspace is waiting, such as book requests,
        missing book details, or kanji cleanup.
      </p>
    </LibraryReminderBanner>
  );
}

export function LearningTasksErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div className="mb-5 rounded-3xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900 shadow-sm">
      Learning tasks could not load: {message}
    </div>
  );
}
