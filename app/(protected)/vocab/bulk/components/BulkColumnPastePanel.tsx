type BulkColumnPastePanelProps = {
  bulkPageList: string;
  bulkChapterNumberList: string;
  bulkChapterNameList: string;
  recentAction: string | null;
  onBulkPageListChange: (value: string) => void;
  onBulkChapterNumberListChange: (value: string) => void;
  onBulkChapterNameListChange: (value: string) => void;
  onApplyBulkColumnList: (
    field: "page" | "chapterNumber" | "chapterName",
    value: string,
    actionKey: string
  ) => void;
};

export default function BulkColumnPastePanel({
  bulkPageList,
  bulkChapterNumberList,
  bulkChapterNameList,
  recentAction,
  onBulkPageListChange,
  onBulkChapterNumberListChange,
  onBulkChapterNameListChange,
  onApplyBulkColumnList,
}: BulkColumnPastePanelProps) {
  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-1 text-lg font-medium">Paste Row-by-Row Columns</div>
      <p className="mb-3 text-sm text-gray-500">
        Paste one value per line. Line 1 matches word 1, line 2 matches word 2, and so on.
      </p>

      <div className="space-y-4">
        <div>
          <div className="mb-1 text-sm font-medium text-gray-700">Page numbers</div>
          <textarea
            value={bulkPageList}
            onChange={(e) => onBulkPageListChange(e.target.value)}
            rows={5}
            placeholder={`45\n46\n46\n47`}
            className="w-full rounded border p-3 font-mono text-sm"
          />
          <div className="mt-2">
            <button
              type="button"
              onClick={() => onApplyBulkColumnList("page", bulkPageList, "page-list")}
              className="rounded bg-blue-600 px-3 py-2 text-white hover:bg-blue-700"
            >
              {recentAction === "page-list" ? "Added!" : "Apply page list"}
            </button>
          </div>
        </div>

        <div>
          <div className="mb-1 text-sm font-medium text-gray-700">Chapter numbers</div>
          <textarea
            value={bulkChapterNumberList}
            onChange={(e) => onBulkChapterNumberListChange(e.target.value)}
            rows={5}
            placeholder={`3\n3\n3\n4`}
            className="w-full rounded border p-3 font-mono text-sm"
          />
          <div className="mt-2">
            <button
              type="button"
              onClick={() =>
                onApplyBulkColumnList(
                  "chapterNumber",
                  bulkChapterNumberList,
                  "chapter-number-list"
                )
              }
              className="rounded bg-blue-600 px-3 py-2 text-white hover:bg-blue-700"
            >
              {recentAction === "chapter-number-list"
                ? "Added!"
                : "Apply chapter # list"}
            </button>
          </div>
        </div>

        <div>
          <div className="mb-1 text-sm font-medium text-gray-700">Chapter names</div>
          <textarea
            value={bulkChapterNameList}
            onChange={(e) => onBulkChapterNameListChange(e.target.value)}
            rows={5}
            placeholder={`Festival\nFestival\nFestival\nAftermath`}
            className="w-full rounded border p-3 font-mono text-sm"
          />
          <div className="mt-2">
            <button
              type="button"
              onClick={() =>
                onApplyBulkColumnList(
                  "chapterName",
                  bulkChapterNameList,
                  "chapter-name-list"
                )
              }
              className="rounded bg-blue-600 px-3 py-2 text-white hover:bg-blue-700"
            >
              {recentAction === "chapter-name-list"
                ? "Added!"
                : "Apply chapter name list"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}