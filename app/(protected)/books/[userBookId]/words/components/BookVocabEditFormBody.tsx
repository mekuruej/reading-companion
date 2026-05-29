type BookVocabEditFormBodyProps = {
  cacheSurface?: string | null;

  editSurface: string;
  editReading: string;
  editJlpt: string;
  editMeaning: string;
  editChapterNum: string;
  editChapterName: string;
  editPage: string;
  editMeaningChoices: unknown[];
  editMeaningChoiceIndex: number | null;
  editHideKanjiInReadingSupport: boolean;

  onEditSurfaceChange: (value: string) => void;
  onEditReadingChange: (value: string) => void;
  onEditJlptChange: (value: string) => void;
  onDefinitionChange: (value: string) => void;
  onEditMeaningChange: (value: string) => void;
  onEditChapterNumChange: (value: string) => void;
  onEditChapterNameChange: (value: string) => void;
  onEditPageChange: (value: string) => void;
  onEditHideKanjiInReadingSupportChange: (value: boolean) => void;
};

// Controlled edit form for one saved vocabulary word.
// page.tsx still owns all edit state, definition-change behavior, and save logic.
// This component only renders the form fields and reports changes upward.
export default function BookVocabEditFormBody({
  cacheSurface,
  editSurface,
  editReading,
  editJlpt,
  editMeaning,
  editChapterNum,
  editChapterName,
  editPage,
  editMeaningChoices,
  editMeaningChoiceIndex,
  editHideKanjiInReadingSupport,
  onEditSurfaceChange,
  onEditReadingChange,
  onEditJlptChange,
  onDefinitionChange,
  onEditMeaningChange,
  onEditChapterNumChange,
  onEditChapterNameChange,
  onEditPageChange,
  onEditHideKanjiInReadingSupportChange,
}: BookVocabEditFormBodyProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-600">Word (book form)</span>
        <input
          value={editSurface}
          onChange={(e) => onEditSurfaceChange(e.target.value)}
          className="border p-2 rounded"
        />

        {cacheSurface && cacheSurface !== editSurface ? (
          <span className="text-[11px] text-gray-500">
            Dictionary form: {cacheSurface}
          </span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-600">Reading</span>
        <input
          value={editReading}
          onChange={(e) => onEditReadingChange(e.target.value)}
          className="border p-2 rounded"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-600">JLPT</span>
        <select
          value={editJlpt}
          onChange={(e) => onEditJlptChange(e.target.value)}
          className="border p-2 rounded bg-white"
        >
          <option value="">NON-JLPT</option>
          <option value="N5">N5</option>
          <option value="N4">N4</option>
          <option value="N3">N3</option>
          <option value="N2">N2</option>
          <option value="N1">N1</option>
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-600">Definition #</span>
        {editMeaningChoices.length > 0 ? (
          <select
            value={
              editMeaningChoiceIndex == null
                ? "other"
                : String(editMeaningChoiceIndex)
            }
            onChange={(e) => onDefinitionChange(e.target.value)}
            className="border p-2 rounded bg-white"
          >
            {editMeaningChoices.map((_, i) => (
              <option key={i} value={i}>
                {i + 1}
              </option>
            ))}
            <option value="other">Other</option>
          </select>
        ) : (
          <select
            value={editMeaningChoiceIndex == null ? "other" : "0"}
            onChange={(e) => onDefinitionChange(e.target.value)}
            className="border p-2 rounded bg-white"
          >
            <option value="other">Other</option>
          </select>
        )}
      </label>

      <label className="flex flex-col gap-1 sm:col-span-2">
        <span className="text-xs text-gray-600">Meaning</span>
        <textarea
          value={editMeaning}
          onChange={(e) => onEditMeaningChange(e.target.value)}
          className="border p-2 rounded min-h-[90px]"
        />
        {editMeaningChoices.length > 1 ? (
          <p className="text-[11px] text-gray-500">
            Tip: changing “Definition #” will overwrite Meaning to match that
            definition.
          </p>
        ) : null}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-600">Chapter #</span>
        <input
          value={editChapterNum}
          onChange={(e) => onEditChapterNumChange(e.target.value)}
          className="border p-2 rounded"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-600">Chapter title</span>
        <input
          value={editChapterName}
          onChange={(e) => onEditChapterNameChange(e.target.value)}
          className="border p-2 rounded"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-600">Page</span>
        <input
          value={editPage}
          onChange={(e) => onEditPageChange(e.target.value)}
          className="border p-2 rounded"
        />
      </label>

      <label className="flex items-start gap-2 text-sm text-stone-700 sm:col-span-2">
        <input
          type="checkbox"
          checked={editHideKanjiInReadingSupport}
          onChange={(e) =>
            onEditHideKanjiInReadingSupportChange(e.target.checked)
          }
          className="mt-0.5"
        />
        <span>
          <span className="font-medium">Hide kanji in Reading Support</span>
          <span className="block text-xs text-stone-500">
            Use kana to match the book.
          </span>
        </span>
      </label>
    </div>
  );
}