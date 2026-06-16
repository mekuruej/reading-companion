type AbilityCheckNoCardsStateProps = {
  onOpenWordSky: () => void;
  onBackToLibrary: () => void;
};

export default function AbilityCheckNoCardsState({
  onOpenWordSky,
  onBackToLibrary,
}: AbilityCheckNoCardsStateProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-100 p-6">
      <div className="w-full max-w-xl rounded-2xl border bg-white p-8 text-center shadow-sm">
        <p className="text-2xl font-semibold text-gray-700">
          No words are ready for Ability Check yet.
        </p>

        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
          Add words from books or use Word Sky to build your check pool.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onOpenWordSky}
            className="rounded-2xl border border-sky-200 bg-sky-100 px-5 py-3 text-sm font-semibold text-sky-950 shadow-sm transition hover:bg-sky-50"
          >
            Open Word Sky
          </button>

          <button
            type="button"
            onClick={onBackToLibrary}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Back to Library
          </button>
        </div>
      </div>
    </main>
  );
}