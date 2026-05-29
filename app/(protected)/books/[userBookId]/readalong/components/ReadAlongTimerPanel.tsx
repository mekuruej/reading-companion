type ReadAlongTimerPanelProps = {
  isRunning: boolean;
  isPaused: boolean;
  elapsedLabel: string;
  showTimedSessionForm: boolean;
  sessionStartPage: string;
  sessionEndPage: string;
  timerSaveMessage: string;

  onStartTimer: () => void;
  onPauseTimer: () => void;
  onFinishRunningTimer: () => void | Promise<void>;
  onResumeTimer: () => void;
  onFinishPausedTimer: () => void | Promise<void>;
  onSessionStartPageChange: (value: string) => void;
  onSessionEndPageChange: (value: string) => void;
  onSaveTimedSession: () => void | Promise<void>;
  onCancelTimedSession: () => void;
};

// Timer and timed-session form for Fluid Reading.
// page.tsx still owns timer state, date defaults, validation, and Supabase saving;
// this component only renders controls/forms and calls page-owned callbacks.
export default function ReadAlongTimerPanel({
  isRunning,
  isPaused,
  elapsedLabel,
  showTimedSessionForm,
  sessionStartPage,
  sessionEndPage,
  timerSaveMessage,
  onStartTimer,
  onPauseTimer,
  onFinishRunningTimer,
  onResumeTimer,
  onFinishPausedTimer,
  onSessionStartPageChange,
  onSessionEndPageChange,
  onSaveTimedSession,
  onCancelTimedSession,
}: ReadAlongTimerPanelProps) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white px-3 py-3">
      <div className="mb-2 text-center text-sm text-stone-600">
        Use the timer to track your fluid reading session, whether you read quietly or with saved word support.
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {!isRunning && !isPaused ? (
          <button
            type="button"
            onClick={onStartTimer}
            className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
          >
            Start Timer
          </button>
        ) : null}

        {isRunning ? (
          <>
            <button
              type="button"
              onClick={onPauseTimer}
              className="rounded-xl bg-amber-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-amber-600"
            >
              Pause
            </button>

            <button
              type="button"
              onClick={() => {
                void onFinishRunningTimer();
              }}
              className="rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700"
            >
              Finish
            </button>
          </>
        ) : null}

        {isPaused ? (
          <>
            <button
              type="button"
              onClick={onResumeTimer}
              className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              Resume
            </button>

            <button
              type="button"
              onClick={() => {
                void onFinishPausedTimer();
              }}
              className="rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700"
            >
              Finish
            </button>
          </>
        ) : null}

        <div className="flex items-center rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700">
          ⏱ {elapsedLabel}
        </div>
      </div>

      {showTimedSessionForm && !isRunning ? (
        <div className="mt-3 rounded-2xl border border-stone-300 bg-white p-4">
          <div className="mb-3 text-sm font-medium text-stone-700">
            Save this reading session
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-sm text-stone-600">Start page</div>
              <input
                type="number"
                min={1}
                value={sessionStartPage}
                onChange={(e) => onSessionStartPageChange(e.target.value)}
                placeholder="e.g. 45"
                className="w-full rounded border px-3 py-2 text-sm"
              />
            </div>

            <div>
              <div className="mb-1 text-sm text-stone-600">End page</div>
              <input
                type="number"
                min={1}
                value={sessionEndPage}
                onChange={(e) => onSessionEndPageChange(e.target.value)}
                placeholder="e.g. 52"
                className="w-full rounded border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="mt-3 text-sm text-stone-500">
            Time: {elapsedLabel}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                void onSaveTimedSession();
              }}
              className="rounded-2xl bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
            >
              Save Timed Session
            </button>

            <button
              type="button"
              onClick={onCancelTimedSession}
              className="rounded-2xl bg-stone-200 px-4 py-2 text-sm font-medium text-stone-900 transition hover:bg-stone-300"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {isRunning || isPaused ? (
        <p className="mt-2 text-xs text-amber-600">
          Timer is active. If you leave Read Along or refresh the page, you may lose your session.
        </p>
      ) : null}

      {timerSaveMessage ? (
        <p className="mt-2 text-xs text-emerald-600">{timerSaveMessage}</p>
      ) : null}
    </div>
  );
}