type LibraryGuidePanelProps = {
  // Route decisions stay in page.tsx; this panel only displays guide buttons.
  onNavigate: (path: string) => void;
  hasFullAccess: boolean;
};

export default function LibraryGuidePanel({
  onNavigate,
  hasFullAccess,
}: LibraryGuidePanelProps) {
  const renderReadingCompanionGuide = ({
    includeAddBookInGrid,
    useShortDescriptions,
    showFinishedDnfNote,
  }: {
    includeAddBookInGrid: boolean;
    useShortDescriptions: boolean;
    showFinishedDnfNote: boolean;
  }) => (
    <div className="mt-4 space-y-4">
      {!includeAddBookInGrid ? (
        <button
          type="button"
          onClick={() => onNavigate("/books/add")}
          className="rounded-2xl border border-sky-100 bg-sky-50/70 px-3 py-2.5 text-left transition hover:-translate-y-0.5 hover:bg-sky-100"
        >
          <div className="text-sm font-black text-slate-950">Add Book</div>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            {useShortDescriptions
              ? "Add books to your Library."
              : "Add books you are reading or want to track."}
          </p>
        </button>
      ) : null}

      <div className={`grid gap-3 sm:grid-cols-2 ${includeAddBookInGrid ? "lg:grid-cols-6" : "lg:grid-cols-5"}`}>
        {includeAddBookInGrid ? (
          <button
            type="button"
            onClick={() => onNavigate("/books/add")}
            className="rounded-2xl border border-sky-100 bg-sky-50/70 px-3 py-2.5 text-left transition hover:-translate-y-0.5 hover:bg-sky-100"
          >
            <div className="text-sm font-black text-slate-950">Add Book</div>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Add books to your Library.
            </p>
          </button>
        ) : null}

        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
          <div className="text-sm font-black text-slate-950">Open a Book Hub</div>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            {useShortDescriptions
              ? "Click a book cover below."
              : "After adding a book or books, click a book cover below."}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 py-2.5">
          <div className="text-sm font-black text-slate-950">Read / Listen</div>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            {useShortDescriptions
              ? "Track reading or listening."
              : "In the Book Hub, record reading or listening time and progress."}
          </p>
        </div>

        <div className="rounded-2xl border border-sky-100 bg-sky-50/70 px-3 py-2.5">
          <div className="text-sm font-black text-slate-950">Reading Journal</div>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            {useShortDescriptions
              ? "Keep reading notes."
              : "Keep characters, plot, quotes, notes, and reviews with the book."}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50/70 px-3 py-2.5">
          <div className="text-sm font-black text-slate-950">Reading History</div>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            {useShortDescriptions
              ? "See your past sessions."
              : "Review the reading and listening sessions you have logged for the book."}
          </p>
        </div>

        <div className="rounded-2xl border border-violet-100 bg-violet-50/70 px-3 py-2.5">
          <div className="text-sm font-black text-slate-950">Book Stats</div>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            {useShortDescriptions
              ? "See progress and pace."
              : "See progress, time, pace, and related reading stats for the book."}
          </p>
        </div>
      </div>

      {showFinishedDnfNote ? (
        <p className="text-xs leading-5 text-slate-500">
          From the Book Hub, you can also mark a book Finished or DNF.
        </p>
      ) : null}
    </div>
  );

  const japaneseLearningGuide = (
    <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50/60 px-3 py-3">
      <div>
        <h3 className="text-sm font-black text-slate-950">Japanese Learning</h3>
        <p className="mt-1 text-xs leading-5 text-slate-600">
          Japanese books include extra tools for reading and studying.
        </p>
      </div>

      <button
        type="button"
        onClick={() => onNavigate("/library/japanese-books")}
        className="mt-3 rounded-2xl border border-violet-200 bg-white px-3 py-2.5 text-left text-sm font-black text-violet-950 shadow-sm transition hover:-translate-y-0.5 hover:bg-violet-50"
      >
        Open Japanese Books
      </button>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/80 bg-white/75 px-3 py-2.5">
          <div className="text-sm font-black text-slate-950">Follow-Along</div>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Read with support from saved vocabulary.
          </p>
        </div>

        <div className="rounded-2xl border border-white/80 bg-white/75 px-3 py-2.5">
          <div className="text-sm font-black text-slate-950">Save Words</div>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Look up and save words as you read.
          </p>
        </div>

        <div className="rounded-2xl border border-white/80 bg-white/75 px-3 py-2.5">
          <div className="text-sm font-black text-slate-950">Review Words</div>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Study vocabulary from the book.
          </p>
        </div>
      </div>
    </div>
  );

  const fullAccessGuide = (
    <>
      <p className="mt-3 max-w-3xl text-xs leading-5 text-slate-600 sm:text-sm">
        Use your Library to record and track your books. Open a book&apos;s Book Hub to choose how
        you want to read, listen, take notes, review progress, or study.
      </p>

      {renderReadingCompanionGuide({
        includeAddBookInGrid: true,
        useShortDescriptions: true,
        showFinishedDnfNote: false,
      })}
      {japaneseLearningGuide}
    </>
  );

  const freeAccessGuide = renderReadingCompanionGuide({
    includeAddBookInGrid: false,
    useShortDescriptions: false,
    showFinishedDnfNote: true,
  });

  return (
    <div className="mb-8 w-full">
      <details className="rounded-3xl border border-sky-200 bg-white/85 px-5 py-4 text-left shadow-sm md:hidden">
        <summary className="cursor-pointer text-sm font-black text-slate-900">
          How do I use this Library on my phone?
        </summary>

        {hasFullAccess ? (
          fullAccessGuide
        ) : (
          freeAccessGuide
        )}
      </details>

      <details className="hidden max-w-[1200px] rounded-3xl border border-sky-200 bg-white/85 px-5 py-4 text-left shadow-sm md:block">
        <summary className="cursor-pointer text-sm font-black text-slate-900">
          How do I use this Library?
        </summary>

        {hasFullAccess ? (
          fullAccessGuide
        ) : (
          <>
            <p className="mt-3 max-w-3xl text-xs leading-5 text-slate-600 sm:text-sm">
              Use your Library as a simple reading tracker. Add books, open a
              Book Hub, then track reading, notes, history, and progress there.
            </p>

            {freeAccessGuide}
          </>
        )}
      </details>
    </div>
  );
}
