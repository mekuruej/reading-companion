import LibraryReminderBanner from "./LibraryReminderBanner";

export function AbilityCheckReminderBanner({
  abilityCheckReminderCount,
  onStart,
  onHide,
}: {
  abilityCheckReminderCount: number;
  onStart: () => void;
  onHide: () => void;
}) {
  return (
    <LibraryReminderBanner
      title="Your Ability Check is ready"
      actions={
        <>
          {abilityCheckReminderCount > 0 ? (
            <button
              type="button"
              onClick={onStart}
              className="rounded-xl bg-sky-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800"
            >
              Start Ability Check
            </button>
          ) : null}

          <button
            type="button"
            onClick={onHide}
            className="rounded-xl border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-sky-900 transition hover:bg-sky-100"
          >
            {abilityCheckReminderCount > 0 ? "Hide today" : "Hide"}
          </button>
        </>
      }
    >
      {abilityCheckReminderCount > 0 ? (
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Some cards are ready for today. Ability Check is intentionally small and
          spaced. For more study, use Library Review, Word Sky, or book flashcards.
        </p>
      ) : (
        <p className="mt-1 text-sm leading-6 text-slate-600">
          No Ability Check cards are due today. That is normal, especially in the
          beginning! Ability Check only shows spaced cards when they are ready.
          <br />
          For extra study, use Library Review or Book Flashcards. To boost words in
          your Ability Check, try Word Sky or read and add more words!
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