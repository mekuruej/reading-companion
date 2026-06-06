type WordSeenInstanceItem = {
  id: string;
  books_title: string;
  meaning: string | null;
  meaning_choice_index: number | null;
  page_number: number | null;
  chapter_number: number | null;
  chapter_name: string | null;
};

type WordSeenInSectionProps = {
  repeatsInThisBook: number;
  totalLookupCount: number;
  seenInstances: WordSeenInstanceItem[];
  meaningChoices: string[];
  getChapterDisplay: (chapterNumber: number | null, chapterName: string | null) => string;
};

export default function WordSeenInSection({
  repeatsInThisBook,
  totalLookupCount,
  seenInstances,
  meaningChoices,
  getChapterDisplay,
}: WordSeenInSectionProps) {
  return (
    <section className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
      <div className="mb-4 text-lg font-semibold">Seen In</div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border p-3">
          <div className="text-xs text-gray-500">Repeats in this book</div>
          <div className="text-2xl font-semibold">{repeatsInThisBook}</div>
          <div className="mt-1 text-xs text-gray-400">
            All saved uses of this word in this book
          </div>
        </div>

        <div className="rounded-xl border p-3">
          <div className="text-xs text-gray-500">Total lookup count</div>
          <div className="text-2xl font-semibold">{totalLookupCount}</div>
          <div className="mt-1 text-xs text-gray-400">Across all your books</div>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 text-sm font-semibold">Seen in</div>

        {seenInstances.length === 0 ? (
          <div className="text-sm text-gray-500">No saved instances found yet.</div>
        ) : (
          <div className="space-y-2">
            {seenInstances.map((item) => {
              const defIndex =
                item.meaning_choice_index != null
                  ? item.meaning_choice_index
                  : meaningChoices.findIndex((m) => m === item.meaning);

              const chapterLabel = getChapterDisplay(
                item.chapter_number,
                item.chapter_name
              );

              return (
                <div key={item.id} className="rounded-xl border p-3">
                  <div className="font-medium text-stone-900">
                    {item.books_title}
                  </div>

                  <div className="mt-1 text-sm text-stone-600">
                    {chapterLabel ? chapterLabel : "No chapter"}
                    {item.page_number != null ? ` • p. ${item.page_number}` : ""}
                  </div>

                  {item.meaning ? (
                    <div className="mt-1 text-sm text-stone-500">
                      {defIndex !== -1 && defIndex != null
                        ? `Def ${defIndex + 1}: `
                        : ""}
                      {item.meaning}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}