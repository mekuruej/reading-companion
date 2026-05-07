// Vocab Tab
//

type UserBook = {
  id: string;
};

type VocabTabMode = "readAlong" | "bulk";

type StudyTabProps = {
  row: UserBook;
  vocabTab: VocabTabMode;
  setVocabTab: (value: VocabTabMode) => void;
};

export default function StudyTab({
  row,
  vocabTab,
  setVocabTab,
}: StudyTabProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <a
            href={`/vocab/explore?userBookId=${row.id}`}
            className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-center text-sm font-medium text-stone-800 shadow-sm transition hover:bg-stone-100 md:px-5 md:py-4 md:text-base"
          >
            Word History in This Book
            <p className="mt-1 text-sm text-stone-500">
              See where a word appeared in this book
            </p>
            <p className="text-sm text-stone-500">and how you saved it.</p>
          </a>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="mb-3 text-sm font-semibold text-stone-900">Add Vocab</div>

        <div className="grid gap-3 md:grid-cols-2">
          <a
            href={`/books/${encodeURIComponent(row.id)}/add-word`}
            className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-center text-sm font-medium text-stone-800 shadow-sm transition hover:bg-stone-100 md:px-5 md:py-4 md:text-base"
          >
            Single Add
            <p className="mt-1 text-sm text-stone-500">
              Add one word to this book outside of a reading session.
            </p>
            <p className="text-sm text-stone-500">
              Best for quick fixes, remembered words, or one-off additions.
            </p>
          </a>

          <a
            href={`/vocab/bulk?userBookId=${row.id}`}
            className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-center text-sm font-medium text-stone-800 shadow-sm transition hover:bg-stone-100 md:px-5 md:py-4 md:text-base"
          >
            Bulk Add
            <p className="mt-1 text-sm text-stone-500">
              Add several words to this book at once.
            </p>
            <p className="text-sm text-stone-500">
              Best for lesson prep, copied notes, or page/chapter word lists.
            </p>
          </a>
        </div>
      </div>
    </div>
  );
}