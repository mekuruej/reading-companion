type CuriosityFullAccessRequiredProps = {
  title: string;
  message: string;
  bookTitle: string;
  onBackToBookHub: () => void;
  onUseJustReadingTimer: () => void;
};

export default function CuriosityFullAccessRequired({
  title,
  message,
  bookTitle,
  onBackToBookHub,
  onUseJustReadingTimer,
}: CuriosityFullAccessRequiredProps) {
  return (
    <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">
            Full access feature
          </p>

          <h1 className="mt-2 text-2xl font-black text-stone-950">
            {title}
          </h1>

          <p className="mt-3 text-sm leading-6 text-stone-600">
            {message}
          </p>

          <p className="mt-3 text-sm leading-6 text-stone-600">
            You can still use timer-only reading from the Book Hub.
          </p>

          {bookTitle ? (
            <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-xs uppercase tracking-wide text-stone-500">
                Current book
              </p>
              <p className="mt-1 font-semibold text-stone-900">
                {bookTitle}
              </p>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onBackToBookHub}
              className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800"
            >
              Back to Book Hub
            </button>

            <button
              type="button"
              onClick={onUseJustReadingTimer}
              className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
            >
              Use Just Reading Timer
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}