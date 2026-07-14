import ChapterNameCombobox from "@/components/ChapterNameCombobox";

type EnglishItemType = "word" | "phrase";

type AddEnglishWordFieldsProps = {
  itemType: EnglishItemType;
  source: string;
  support: string;
  pageNumber: string;
  chapterNumber: string;
  chapterName: string;
  chapterNameOptions: string[];
  saving: boolean;
  isEditing: boolean;
  savedNotice: string;
  onItemTypeChange: (value: EnglishItemType) => void;
  onSourceChange: (value: string) => void;
  onSupportChange: (value: string) => void;
  onPageNumberChange: (value: string) => void;
  onChapterNumberChange: (value: string) => void;
  onChapterNameChange: (value: string) => void;
  onSaveWord: () => void;
  onClearWordFields: () => void;
};

export default function AddEnglishWordFields({
  itemType,
  source,
  support,
  pageNumber,
  chapterNumber,
  chapterName,
  chapterNameOptions,
  saving,
  isEditing,
  savedNotice,
  onItemTypeChange,
  onSourceChange,
  onSupportChange,
  onPageNumberChange,
  onChapterNumberChange,
  onChapterNameChange,
  onSaveWord,
  onClearWordFields,
}: AddEnglishWordFieldsProps) {
  return (
    <>
      <div className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-600">
        <span className="font-semibold text-stone-900">English Reader:</span>{" "}
        Save the English text from the book with Japanese support.
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-700">
          Item type
        </span>
        <select
          value={itemType}
          onChange={(event) => onItemTypeChange(event.target.value as EnglishItemType)}
          className="w-full rounded border bg-white px-3 py-2 text-sm"
        >
          <option value="word">Word</option>
          <option value="phrase">Phrase</option>
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-700">
          English word or phrase
        </span>
        <textarea
          value={source}
          onChange={(event) => onSourceChange(event.target.value)}
          placeholder="bring oneself to do"
          className="min-h-[72px] w-full rounded border bg-white px-3 py-2 text-sm"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-700">
          Japanese meaning / support
        </span>
        <textarea
          value={support}
          onChange={(event) => onSupportChange(event.target.value)}
          placeholder="思い切って〜する / 〜する気になる"
          className="min-h-[96px] w-full rounded border bg-white px-3 py-2 text-sm"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">
            Page
          </span>
          <input
            type="number"
            min={1}
            inputMode="numeric"
            value={pageNumber}
            onChange={(event) => onPageNumberChange(event.target.value)}
            placeholder="Page"
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </label>

        <ChapterNameCombobox
          value={chapterName}
          onChange={onChapterNameChange}
          chapterOptions={chapterNameOptions}
          inputClassName="w-full rounded border px-3 py-2 text-sm"
        />

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">
            Chapter number
          </span>
          <input
            value={chapterNumber}
            onChange={(event) => onChapterNumberChange(event.target.value)}
            placeholder="Chapter #"
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onSaveWord}
          disabled={saving || !source.trim() || !support.trim()}
          className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
        >
          {saving
            ? isEditing
              ? "Updating..."
              : "Saving..."
            : isEditing
              ? "Update Item"
              : "Save Item"}
        </button>

        <button
          type="button"
          onClick={onClearWordFields}
          className="rounded-xl bg-stone-200 px-4 py-2 text-sm font-medium text-stone-900 hover:bg-stone-300"
        >
          Clear Fields
        </button>

        {savedNotice ? (
          <span className="text-sm font-medium text-emerald-700">
            {savedNotice}
          </span>
        ) : null}
      </div>
    </>
  );
}
