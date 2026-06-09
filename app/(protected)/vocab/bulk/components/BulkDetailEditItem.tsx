type BulkDetailEditItemProps = {
  surface: string;
  reading: string;
  meaning: string;
  page: string;
  chapterNumber: string;
  chapterName: string;
  hideKanjiInReadingSupport: boolean;
  onPageChange: (value: string) => void;
  onChapterNumberChange: (value: string) => void;
  onChapterNameChange: (value: string) => void;
  onHideKanjiInReadingSupportChange: (checked: boolean) => void;
};

export default function BulkDetailEditItem({
  surface,
  reading,
  meaning,
  page,
  chapterNumber,
  chapterName,
  hideKanjiInReadingSupport,
  onPageChange,
  onChapterNumberChange,
  onChapterNameChange,
  onHideKanjiInReadingSupportChange,
}: BulkDetailEditItemProps) {
  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 text-lg font-semibold">{surface}</div>
      <div className="mb-2 text-sm text-gray-600">
        {reading || "—"} · {meaning || "—"}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <div className="mb-1 text-xs text-gray-500">Page</div>
          <input
            type="number"
            placeholder="Page"
            value={page}
            onChange={(e) => onPageChange(e.target.value)}
            className="w-full rounded border p-2 text-sm"
          />
        </div>

        <div>
          <div className="mb-1 text-xs text-gray-500">Chapter #</div>
          <input
            type="number"
            placeholder="Chapter #"
            value={chapterNumber}
            onChange={(e) => onChapterNumberChange(e.target.value)}
            className="w-full rounded border p-2 text-sm"
          />
        </div>

        <div>
          <div className="mb-1 text-xs text-gray-500">Chapter Name</div>
          <input
            type="text"
            placeholder="Chapter name"
            value={chapterName}
            onChange={(e) => onChapterNameChange(e.target.value)}
            className="w-full rounded border p-2 text-sm"
          />
        </div>
      </div>

      <label className="mt-3 flex items-start gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          checked={hideKanjiInReadingSupport}
          onChange={(e) => onHideKanjiInReadingSupportChange(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          <span className="font-medium">Hide kanji in Reading Support</span>
          <span className="block text-xs text-stone-500">
            Use kana to match the book.
          </span>
        </span>
      </label>
    </li>
  );
}