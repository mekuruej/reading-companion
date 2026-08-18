type LibraryGuidePanelProps = {
  // Route decisions stay in page.tsx; this panel only displays guide buttons.
  onNavigate: (path: string) => void;
  hasFullAccess: boolean;
};

export default function LibraryGuidePanel({
  onNavigate,
  hasFullAccess,
}: LibraryGuidePanelProps) {
  const freeGuide = (
    <div className="mt-4 space-y-4">
      <button
        type="button"
        onClick={() => onNavigate("/books/add")}
        className="rounded-2xl border border-sky-100 bg-sky-50/70 px-3 py-2.5 text-left transition hover:-translate-y-0.5 hover:bg-sky-100"
      >
        <div className="text-sm font-black text-slate-950">Add Book</div>
        <p className="mt-1 text-xs leading-5 text-slate-600">
          Add books you are reading or want to track.
        </p>
      </button>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
          <div className="text-sm font-black text-slate-950">Open a book</div>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            After adding a book or books, click a book cover below to open its Book Hub.
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 py-2.5">
          <div className="text-sm font-black text-slate-950">Read / Listen</div>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            In the Book Hub, record reading or listening time and progress.
          </p>
        </div>

        <div className="rounded-2xl border border-sky-100 bg-sky-50/70 px-3 py-2.5">
          <div className="text-sm font-black text-slate-950">Reading Journal</div>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Keep characters, plot, quotes, notes, and reviews with the book.
          </p>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50/70 px-3 py-2.5">
          <div className="text-sm font-black text-slate-950">Look back</div>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Reading History shows sessions. Book Stats shows progress, time, and pace.
          </p>
        </div>
      </div>

      <p className="text-xs leading-5 text-slate-500">
        From the Book Hub, you can also mark a book Finished or DNF.
      </p>
    </div>
  );

  return (
    <div className="mb-8 w-full">
      <details className="rounded-3xl border border-sky-200 bg-white/85 px-5 py-4 text-left shadow-sm md:hidden">
        <summary className="cursor-pointer text-sm font-black text-slate-900">
          How do I use this Library on my phone?
        </summary>

        {hasFullAccess ? (
          <div className="mt-4 grid gap-3">
          <button
            type="button"
            onClick={() => onNavigate("/books/add")}
            className="rounded-2xl border border-sky-100 bg-sky-50/70 px-3 py-2.5 text-left transition hover:-translate-y-0.5 hover:bg-sky-100"
          >
            <div className="text-sm font-black text-slate-950">Add Book</div>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Add a new book to your library.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate("/library/curiosity-reading-index")}
            className="rounded-2xl border border-rose-100 bg-rose-50/70 px-3 py-2.5 text-left transition hover:-translate-y-0.5 hover:bg-rose-100"
          >
            <div className="text-sm font-black text-slate-950">Curiosity Read</div>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Time your reading and quickly save words as you go.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate("/library/saved-word-reading-index")}
            className="rounded-2xl border border-indigo-100 bg-indigo-50/70 px-3 py-2.5 text-left transition hover:-translate-y-0.5 hover:bg-indigo-100"
          >
            <div className="text-sm font-black text-slate-950">Follow-Along</div>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Read with support from your book.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate("/library/just-listening-index")}
            className="rounded-2xl border border-amber-100 bg-amber-50/70 px-3 py-2.5 text-left transition hover:-translate-y-0.5 hover:bg-amber-100"
          >
            <div className="text-sm font-black text-slate-950">Listen</div>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Track listening time for a book or audiobook.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate("/library/just-reading-index")}
            className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 py-2.5 text-left transition hover:-translate-y-0.5 hover:bg-emerald-100"
          >
            <div className="text-sm font-black text-slate-950">Just Read</div>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Time your regular reading.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate("/library-study/book-flashcards")}
            className="rounded-2xl border border-violet-100 bg-violet-50/70 px-3 py-2.5 text-left transition hover:-translate-y-0.5 hover:bg-violet-100"
          >
            <div className="text-sm font-black text-slate-950">Flashcards</div>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Review words from your books.
            </p>
          </button>
          </div>
        ) : (
          freeGuide
        )}
      </details>

      <details className="hidden max-w-[1200px] rounded-3xl border border-sky-200 bg-white/85 px-5 py-4 text-left shadow-sm md:block">
        <summary className="cursor-pointer text-sm font-black text-slate-900">
          How do I use this library?
        </summary>

        {hasFullAccess ? (
          <>
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
                Time your reading with saved-word support.
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
                Listen
              </div>
              <p className="mt-1 truncate text-xs text-slate-600">
                Track listening time for a book or audiobook.
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
          </>
        ) : (
          <>
            <p className="mt-3 max-w-3xl text-xs leading-5 text-slate-600 sm:text-sm">
              Use your Library as a simple reading tracker. Add books, open a
              Book Hub, then track reading, notes, history, and progress there.
            </p>

            {freeGuide}
          </>
        )}
      </details>
    </div>
  );
}
