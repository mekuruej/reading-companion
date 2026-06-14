import type { RefObject } from "react";
import ChapterNameCombobox from "@/components/ChapterNameCombobox";

type CuriosityWordDetailPreview = {
  surface: string;
  reading: string;
  alternateSurface: string;
  meanings: string[];
  selectedMeaningIndex: number;
  meaning: string;
  isCustomMeaning: boolean;
  page: string;
  chapterNumber: string;
  chapterName: string;
};

type CuriosityWordDetailFieldsProps = {
  quickPreview: CuriosityWordDetailPreview;
  chapterNameOptions: string[];
  hideKanjiInReadingSupport: boolean;
  isEditing: boolean;
  savedQuickNotice: string;
  quickWordFieldsRef: RefObject<HTMLDivElement | null>;
  onReadingChange: (value: string) => void;
  onAlternateSurfaceChange: (value: string) => void;
  onMeaningChoiceChange: (index: number, meaning: string) => void;
  onCustomMeaningChange: (value: string) => void;
  onPageChange: (value: string) => void;
  onChapterNumberChange: (value: string) => void;
  onChapterNameChange: (value: string) => void;
  onHideKanjiChange: (checked: boolean) => void;
  onSaveWord: () => void;
  onClearWordFields: () => void;
};

export default function CuriosityWordDetailFields({
  quickPreview,
  chapterNameOptions,
  hideKanjiInReadingSupport,
  isEditing,
  savedQuickNotice,
  quickWordFieldsRef,
  onReadingChange,
  onAlternateSurfaceChange,
  onMeaningChoiceChange,
  onCustomMeaningChange,
  onPageChange,
  onChapterNumberChange,
  onChapterNameChange,
  onHideKanjiChange,
  onSaveWord,
  onClearWordFields,
}: CuriosityWordDetailFieldsProps) {
  return (
    <>
      <div ref={quickWordFieldsRef} className="space-y-3">
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
              value={quickPreview.reading}
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
              value={quickPreview.alternateSurface}
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

        {quickPreview.meanings.length > 0 ? (
          <div className="mb-3 space-y-2 rounded-xl border border-stone-200 bg-white p-3">
            {quickPreview.meanings.map((meaning, index) => (
              <label
                key={index}
                className="flex items-start gap-2 text-sm text-stone-700"
              >
                <input
                  type="radio"
                  checked={
                    !quickPreview.isCustomMeaning &&
                    quickPreview.selectedMeaningIndex === index
                  }
                  onChange={() => onMeaningChoiceChange(index, meaning)}
                />
                <span>{meaning || "—"}</span>
              </label>
            ))}
          </div>
        ) : null}

        <textarea
          value={quickPreview.isCustomMeaning ? quickPreview.meaning : ""}
          onChange={(event) => onCustomMeaningChange(event.target.value)}
          placeholder="Type your meaning"
          className="min-h-[80px] w-full rounded border bg-white px-3 py-2 text-sm"
        />
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
            value={quickPreview.page}
            onChange={(event) => onPageChange(event.target.value)}
            placeholder="Page"
            className="w-full rounded border bg-white px-3 py-2 text-sm"
          />
        </label>

        <ChapterNameCombobox
          value={quickPreview.chapterName}
          onChange={onChapterNameChange}
          chapterOptions={chapterNameOptions}
        />

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">
            Chapter number
          </span>
          <input
            value={quickPreview.chapterNumber}
            onChange={(event) => onChapterNumberChange(event.target.value)}
            placeholder="Chapter #"
            className="w-full rounded border bg-white px-3 py-2 text-sm"
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-stone-700">
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
          disabled={!quickPreview.surface.trim()}
          className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
        >
          {isEditing ? "Update Word" : "Save Word"}
        </button>

        <button
          type="button"
          onClick={onClearWordFields}
          className="rounded-xl bg-stone-200 px-4 py-2 text-sm font-medium text-stone-900 hover:bg-stone-300"
        >
          Clear Word Fields
        </button>

        {savedQuickNotice ? (
          <span className="text-sm font-medium text-emerald-700">
            {savedQuickNotice}
          </span>
        ) : null}
      </div>
    </>
  );
}
