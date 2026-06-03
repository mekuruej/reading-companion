type LibraryGuidePanelProps = {
  // Route decisions stay in page.tsx; this panel only displays guide buttons.
  onNavigate: (path: string) => void;
};

export default function LibraryGuidePanel({
  onNavigate,
}: LibraryGuidePanelProps) {
  return (
    <div className="mb-8 w-full">
      <details className="max-w-[1200px] rounded-3xl border border-sky-200 bg-white/85 px-5 py-4 text-left shadow-sm">
        <summary className="cursor-pointer text-sm font-black text-slate-900">
          How do I use this library?
        </summary>

        <p className="mt-3 max-w-3xl text-xs leading-5 text-slate-600 sm:text-sm">
          After requesting a book and adding it to your library, you can choose
          how you want to read, study, listen, or review.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => onNavigate("/library/curiosity-reading-index")}
              className="rounded-2xl border border-rose-100 bg-rose-50/70 px-3 py-2.5 text-left transition hover:-translate-y-0.5 hover:bg-rose-100"
            >
              <div className="text-sm font-black text-slate-950">
                Read + Save Words
              </div>
              <p className="mt-1 truncate text-xs text-slate-600">
                Time your reading while looking up new words.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onNavigate("/library/saved-word-reading-index")}
              className="rounded-2xl border border-indigo-100 bg-indigo-50/70 px-3 py-2.5 text-left transition hover:-translate-y-0.5 hover:bg-indigo-100"
            >
              <div className="text-sm font-black text-slate-950">
                Saved Word Reading
              </div>
              <p className="mt-1 truncate text-xs text-slate-600">
                Time your reading your saved-word support.
              </p>
            </button>
          </div>

          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => onNavigate("/library/just-reading-index")}
              className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 py-2.5 text-left transition hover:-translate-y-0.5 hover:bg-emerald-100"
            >
              <div className="text-sm font-black text-slate-950">
                Just Read
              </div>
              <p className="mt-1 truncate text-xs text-slate-600">
                Just time and read, the old-fashioned way.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onNavigate("/library/just-listening-index")}
              className="rounded-2xl border border-amber-100 bg-amber-50/70 px-3 py-2.5 text-left transition hover:-translate-y-0.5 hover:bg-amber-100"
            >
              <div className="text-sm font-black text-slate-950">
                Just Listen
              </div>
              <p className="mt-1 truncate text-xs text-slate-600">
                Time and track your listening for ear-training purposes.
              </p>
            </button>
          </div>

          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => onNavigate("/library-study")}
              className="rounded-2xl border border-violet-100 bg-violet-50/70 px-3 py-2.5 text-left transition hover:-translate-y-0.5 hover:bg-violet-100"
            >
              <div className="text-sm font-black text-slate-950">
                Study Hub
              </div>
              <p className="mt-1 truncate text-xs text-slate-600">
                Study saved words in a variety of ways.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onNavigate("/community/stats")}
              className="rounded-2xl border border-sky-100 bg-sky-50/70 px-3 py-2.5 text-left transition hover:-translate-y-0.5 hover:bg-sky-100"
            >
              <div className="text-sm font-black text-slate-950">
                Stats Hub
              </div>
              <p className="mt-1 truncate text-xs text-slate-600">
                See habits, vocab, and progress.
              </p>
            </button>
          </div>
        </div>
      </details>
    </div>
  );
}