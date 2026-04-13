// Vocab Tab

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
        <div className="mb-3 text-sm font-semibold text-stone-900">Vocab</div>

        <div className="grid gap-3 md:grid-cols-2">
          <a
            href={`/books/${row.id}/words`}
            className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-center text-sm font-medium text-stone-800 shadow-sm transition hover:bg-stone-100 md:px-5 md:py-4 md:text-base"
          >
            📚 Vocab List
            <p className="mt-1 text-sm text-stone-500">
              Your saved words from this book, in book order.
            </p>
            <p className="text-sm text-stone-500">Review, reorder, and edit each entry.</p>
          </a>

          <a
            href={`/vocab/explore?userBookId=${row.id}`}
            className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-center text-sm font-medium text-stone-800 shadow-sm transition hover:bg-stone-100 md:px-5 md:py-4 md:text-base"
          >
            🔎 Word History in This Book
            <p className="mt-1 text-sm text-stone-500">
              See where a word appeared in this book
            </p>
            <p className="text-sm text-stone-500">and how you saved it.</p>
          </a>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="mb-3 text-sm font-semibold text-stone-900">Add Vocab</div>

        <div className="overflow-x-auto">
          <div className="flex w-max gap-2 whitespace-nowrap">
            <a
              href={`/vocab/single-add?userBookId=${row.id}`}
              className="rounded-2xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
            >
              Single Add
            </a>
            <a
  href={`/vocab/bulk?userBookId=${row.id}`}
  className="rounded-2xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
>
  Bulk Add
</a>
          </div>
        </div>

        {vocabTab === "bulk" && (
          <div className="mt-4 rounded-2xl border border-stone-300 bg-white p-4">
            <div className="text-sm font-medium text-stone-900">Bulk Add</div>
            <p className="mt-1 text-sm text-stone-500">Use the existing bulk input tool.</p>

            <a
              href={`/vocab/bulk?userBookId=${row.id}`}
              className="mt-4 inline-block rounded-2xl bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
            >
              Open Bulk Add
            </a>
          </div>
        )}
      </div>
    </div>
  );
}