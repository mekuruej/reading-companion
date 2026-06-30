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
  seenInstances: WordSeenInstanceItem[];
  meaningChoices: string[];
  getChapterDisplay: (chapterNumber: number | null, chapterName: string | null) => string;
};

export default function WordSeenInSection({
  seenInstances,
  meaningChoices,
  getChapterDisplay,
}: WordSeenInSectionProps) {
  return (
    <section className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
      <div className="mb-4 text-lg font-semibold">Seen In</div>

      <div>
        <div className="mb-2 text-sm font-semibold">Saved from your books</div>

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
