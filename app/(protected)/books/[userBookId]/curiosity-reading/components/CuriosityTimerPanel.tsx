type CuriosityTimerPanelProps = {
  isRunning: boolean;
  isPaused: boolean;
  elapsed: number;
  showTimedSessionForm: boolean;
  sessionStartPage: string;
  sessionEndPage: string;
  timerSaveMessage: string;
  formatTimer: (seconds: number) => string;
  onStart: () => void;
  onPause: () => void;
  onFinish: () => void;
  onResume: () => void;
  onSaveSession: () => void;
  onCancelSession: () => void;
  onSessionStartPageChange: (value: string) => void;
  onSessionEndPageChange: (value: string) => void;
};

export default function CuriosityTimerPanel({
  isRunning,
  isPaused,
  elapsed,
  showTimedSessionForm,
  sessionStartPage,
  sessionEndPage,
  timerSaveMessage,
  formatTimer,
  onStart,
  onPause,
  onFinish,
  onResume,
  onSaveSession,
  onCancelSession,
  onSessionStartPageChange,
  onSessionEndPageChange,
}: CuriosityTimerPanelProps) {
  return (
    <div className="mb-6 rounded-2xl border border-stone-300 bg-white p-4">
      <div className="mb-2 text-sm font-medium text-stone-900">
        Log your reading session
      </div>

      <div className="mt-4 rounded-xl border border-stone-200 bg-white px-3 py-3">
        <div className="mb-2 text-center text-sm text-stone-600">
          Use the timer to track a curiosity reading session where you stop,
          check, and save new words.
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {!isRunning && !isPaused ? (
            <button
              type="button"
              onClick={onStart}
              className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              Start Timer
            </button>
          ) : null}

          {isRunning ? (
            <>
              <button
                type="button"
                onClick={onPause}
                className="rounded-xl bg-amber-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-amber-600"
              >
                Pause
              </button>

              <button
                type="button"
                onClick={onFinish}
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
                onClick={onResume}
                className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                Resume
              </button>

              <button
                type="button"
                onClick={onFinish}
                className="rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700"
              >
                Finish
              </button>
            </>
          ) : null}

          <div className="flex items-center rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700">
            ⏱ {formatTimer(elapsed)}
          </div>
        </div>
      </div>

      {showTimedSessionForm && !isRunning ? (
        <div className="mt-4 rounded-2xl border border-stone-300 bg-stone-50 p-4">
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
                onChange={(event) =>
                  onSessionStartPageChange(event.target.value)
                }
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
                onChange={(event) => onSessionEndPageChange(event.target.value)}
                placeholder="e.g. 52"
                className="w-full rounded border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="mt-3 text-sm text-stone-500">
            Time: {formatTimer(elapsed)}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onSaveSession}
              className="rounded-2xl bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
            >
              Save Timed Session
            </button>

            <button
              type="button"
              onClick={onCancelSession}
              className="rounded-2xl bg-stone-200 px-4 py-2 text-sm font-medium text-stone-900 transition hover:bg-stone-300"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {isRunning || isPaused ? (
        <p className="mt-2 text-xs text-amber-600">
          Timer is active. If you leave or refresh the page, you may lose your
          session.
        </p>
      ) : null}

      {timerSaveMessage ? (
        <p className="mt-2 text-xs text-emerald-600">{timerSaveMessage}</p>
      ) : null}
    </div>
  );
}