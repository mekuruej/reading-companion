import WordPositionField from "@/components/vocabulary/WordPositionField";
import type { ProgressTrackingMethod } from "@/lib/books/readingProgress";
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
  isEditing: boolean;
  savedQuickNotice: string;
  quickWordFieldsRef: RefObject<HTMLDivElement | null>;
  onReadingChange: (value: string) => void;
  onAlternateSurfaceChange: (value: string) => void;
  onMeaningChoiceChange: (index: number, meaning: string) => void;
  onCustomMeaningChange: (value: string) => void;
  positionUnit: ProgressTrackingMethod;
  onPositionUnitChange?: (unit: ProgressTrackingMethod) => void;
  onPageChange: (value: string) => void;
  onChapterNumberChange: (value: string) => void;
  onChapterNameChange: (value: string) => void;
  onSaveWord: () => void;
  onClearWordFields: () => void;
  saveAreaWarning?: string;
};

export default function CuriosityWordDetailFields({
  quickPreview,
  chapterNameOptions,
  isEditing,
  savedQuickNotice,
  quickWordFieldsRef,
  onReadingChange,
  onAlternateSurfaceChange,
  onMeaningChoiceChange,
  onCustomMeaningChange,
  positionUnit,
  onPositionUnitChange,
  onPageChange,
  onChapterNumberChange,
  onChapterNameChange,
  onSaveWord,
  onClearWordFields,
  saveAreaWarning,
}: CuriosityWordDetailFieldsProps) {
  return (
    <>
      <div ref={quickWordFieldsRef} className="space-y-3">
        <div className="text-xs leading-5 text-stone-500">
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
          rows={2}
          value={quickPreview.isCustomMeaning ? quickPreview.meaning : ""}
          onChange={(event) => onCustomMeaningChange(event.target.value)}
          placeholder="Type your meaning"
          className="min-h-[60px] w-full rounded border bg-white px-3 py-2 text-sm"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <WordPositionField value={quickPreview.page} unit={positionUnit} onChange={onPageChange} onUnitChange={isEditing ? onPositionUnitChange : undefined} />

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

      {saveAreaWarning ? (
        <p className="text-xs leading-5 text-amber-600">{saveAreaWarning}</p>
      ) : null}
    </>
  );
}
