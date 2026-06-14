import type { RefObject } from "react";
import ChapterNameCombobox from "@/components/ChapterNameCombobox";

type AddWordDetailFieldsProps = {
  wordFieldsRef: RefObject<HTMLDivElement | null>;
  reading: string;
  alternateSurface: string;
  meaning: string;
  meaningChoices: string[];
  meaningChoiceIndex: number | null;
  pageNumber: string;
  chapterNumber: string;
  chapterName: string;
  chapterNameOptions: string[];
  hideKanjiInReadingSupport: boolean;
  saving: boolean;
  isEditing: boolean;
  word: string;
  savedNotice: string;
  onReadingChange: (value: string) => void;
  onAlternateSurfaceChange: (value: string) => void;
  onMeaningChoiceChange: (index: number, choice: string) => void;
  onCustomMeaningChange: (value: string) => void;
  onPageNumberChange: (value: string) => void;
  onChapterNumberChange: (value: string) => void;
  onChapterNameChange: (value: string) => void;
  onHideKanjiChange: (checked: boolean) => void;
  onSaveWord: () => void;
  onClearWordFields: () => void;
};

export default function AddWordDetailFields({
  wordFieldsRef,
  reading,
  alternateSurface,
  meaning,
  meaningChoices,
  meaningChoiceIndex,
  pageNumber,
  chapterNumber,
  chapterName,
  chapterNameOptions,
  hideKanjiInReadingSupport,
  saving,
  isEditing,
  word,
  savedNotice,
  onReadingChange,
  onAlternateSurfaceChange,
  onMeaningChoiceChange,
  onCustomMeaningChange,
  onPageNumberChange,
  onChapterNumberChange,
  onChapterNameChange,
  onHideKanjiChange,
  onSaveWord,
  onClearWordFields,
}: AddWordDetailFieldsProps) {
  return (
    <>
      <div ref={wordFieldsRef} className="space-y-3">
        <div className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-600">
          <span className="font-semibold text-stone-900">Manual entry:</span>{" "}
          1. Type the word. 2. Add the reading. 3. Add the meaning. 4. Save.
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">
              Reading
            </label>
            <input
              value={reading}
              onChange={(event) => onReadingChange(event.target.value)}
              placeholder="Reading"
              className="w-full rounded border bg-white px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">
              Alternate surface
            </label>
            <input
              value={alternateSurface}
              onChange={(event) => onAlternateSurfaceChange(event.target.value)}
              placeholder="Book form, if different"
              className="w-full rounded border bg-white px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-stone-700">
          Meaning
        </label>

        <div className="space-y-2">
          {meaningChoices.length > 0 ? (
            <div className="space-y-2 rounded-xl border border-stone-200 bg-white p-3">
              {meaningChoices.map((choice, index) => (
                <label
                  key={index}
                  className="flex items-start gap-2 text-sm text-stone-700"
                >
                  <input
                    type="radio"
                    checked={meaningChoiceIndex === index}
                    onChange={() => onMeaningChoiceChange(index, choice)}
                  />
                  <span>{choice || "—"}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-sm text-stone-500">
              No dictionary meanings loaded. Enter your own meaning below.
            </p>
          )}

          <textarea
            value={meaningChoiceIndex == null ? meaning : ""}
            onChange={(event) => onCustomMeaningChange(event.target.value)}
            placeholder="Type your meaning"
            className="min-h-[80px] w-full rounded border px-3 py-2 text-sm"
          />
        </div>
      </div>

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

      <label className="flex items-start gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          checked={hideKanjiInReadingSupport}
          onChange={(event) => onHideKanjiChange(event.target.checked)}
        />
        <span>Hide kanji in Read Along (does not affect Vocab List)</span>
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onSaveWord}
          disabled={saving || !word.trim()}
          className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
        >
          {saving
            ? isEditing
              ? "Updating..."
              : "Saving..."
            : isEditing
              ? "Update Word"
              : "Save Word"}
        </button>

        <button
          type="button"
          onClick={onClearWordFields}
          className="rounded-xl bg-stone-200 px-4 py-2 text-sm font-medium text-stone-900 hover:bg-stone-300"
        >
          Clear Word Fields
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
