import ChapterNameCombobox from "@/components/ChapterNameCombobox";

type BulkApplyFieldsPanelProps = {
  bulkPageNumber: string;
  bulkChapterNumber: string;
  bulkChapterName: string;
  chapterNameOptions: string[];
  recentAction: string | null;
  onBulkPageNumberChange: (value: string) => void;
  onBulkChapterNumberChange: (value: string) => void;
  onBulkChapterNameChange: (value: string) => void;
  onApplyBulkField: (
    field: "page" | "chapterNumber" | "chapterName",
    value: string,
    mode: "blank" | "all",
    actionKey: string
  ) => void;
};

export default function BulkApplyFieldsPanel({
  bulkPageNumber,
  bulkChapterNumber,
  bulkChapterName,
  chapterNameOptions,
  recentAction,
  onBulkPageNumberChange,
  onBulkChapterNumberChange,
  onBulkChapterNameChange,
  onApplyBulkField,
}: BulkApplyFieldsPanelProps) {
  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="space-y-4">
        <div className="grid items-center gap-3 md:grid-cols-[160px_520px_auto]">
          <div className="text-sm font-medium text-gray-700">Page number</div>
          <input
            type="number"
            value={bulkPageNumber}
            onChange={(e) => onBulkPageNumberChange(e.target.value)}
            placeholder="e.g. 45"
            className="rounded border p-2"
          />
          <button
            type="button"
            onClick={() =>
              onApplyBulkField("page", bulkPageNumber, "all", "page-all")
            }
            className="rounded bg-blue-600 px-3 py-2 text-white hover:bg-blue-700"
          >
            {recentAction === "page-all" ? "Added!" : "Apply to all"}
          </button>
        </div>

        <div className="grid items-center gap-3 md:grid-cols-[160px_520px_auto]">
          <div className="text-sm font-medium text-gray-700">Chapter name</div>
          <ChapterNameCombobox
            value={bulkChapterName}
            onChange={onBulkChapterNameChange}
            chapterOptions={chapterNameOptions}
            label=""
            placeholder="e.g. Summer Festival"
            helperText=""
            inputClassName="rounded border p-2"
            showSavedChapterSelect
          />
          <button
            type="button"
            onClick={() =>
              onApplyBulkField(
                "chapterName",
                bulkChapterName,
                "all",
                "chapter-name-all"
              )
            }
            className="rounded bg-blue-600 px-3 py-2 text-white hover:bg-blue-700"
          >
            {recentAction === "chapter-name-all" ? "Added!" : "Apply to all"}
          </button>
        </div>

        <div className="grid items-center gap-3 md:grid-cols-[160px_520px_auto]">
          <div className="text-sm font-medium text-gray-700">Chapter number</div>
          <input
            type="number"
            value={bulkChapterNumber}
            onChange={(e) => onBulkChapterNumberChange(e.target.value)}
            placeholder="e.g. 3"
            className="rounded border p-2"
          />
          <button
            type="button"
            onClick={() =>
              onApplyBulkField(
                "chapterNumber",
                bulkChapterNumber,
                "all",
                "chapter-number-all"
              )
            }
            className="rounded bg-blue-600 px-3 py-2 text-white hover:bg-blue-700"
          >
            {recentAction === "chapter-number-all" ? "Added!" : "Apply to all"}
          </button>
        </div>
      </div>
    </div>
  );
}
