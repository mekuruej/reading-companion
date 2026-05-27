type RecentWord = {
  id: string;
  surface?: string | null;
  reading?: string | null;
  meaning?: string | null;
};

export default function RecentWordsGrid({ words }: { words: RecentWord[] }) {
  if (words.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
        No saved words yet.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {words.map((word) => (
        <div
          key={word.id}
          className="rounded-xl border border-slate-200 bg-white p-3"
        >
          <div className="text-base font-semibold text-slate-950">
            {word.surface || "—"}
          </div>

          {word.reading ? (
            <div className="mt-0.5 text-xs text-slate-500">
              {word.reading}
            </div>
          ) : null}

          <div className="mt-2 line-clamp-2 text-sm leading-5 text-slate-600">
            {word.meaning || "No meaning saved"}
          </div>
        </div>
      ))}
    </div>
  );
}