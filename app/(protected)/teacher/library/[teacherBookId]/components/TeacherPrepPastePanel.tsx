import type { FormEventHandler } from "react";

type TeacherPrepPastePanelProps<T extends string> = {
  itemTypes: readonly T[];
  defaultItemType: T;
  onDefaultItemTypeChange: (value: T) => void;
  itemTypeLabel: (type: T) => string;
  rawInput: string;
  onRawInputChange: (value: string) => void;
  itemCount: number;
  isPreviewing: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

export default function TeacherPrepPastePanel<T extends string>({
  itemTypes,
  defaultItemType,
  onDefaultItemTypeChange,
  itemTypeLabel,
  rawInput,
  onRawInputChange,
  itemCount,
  isPreviewing,
  onSubmit,
}: TeacherPrepPastePanelProps<T>) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
        Step 1
      </p>
      <h2 className="mt-1 text-xl font-black text-stone-900">
        Enter prep items
      </h2>
      <p className="mt-1 text-sm text-stone-500">
        For vocabulary words, use Curiosity Reading or Bulk Add so they stay in
        Reader Vocab, flashcards, and Follow-Along. Use Teaching Prep for
        phrases, grammar notes, translations, sentences, and lesson notes.
      </p>

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-semibold text-stone-500">
            Default item type
          </span>
          <select
            value={defaultItemType}
            onChange={(event) =>
              onDefaultItemTypeChange(event.target.value as T)
            }
            className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 sm:w-64"
          >
            {itemTypes.map((type) => (
              <option key={type} value={type}>
                {itemTypeLabel(type)}
              </option>
            ))}
          </select>
        </label>

        <textarea
          value={rawInput}
          onChange={(event) => onRawInputChange(event.target.value)}
          rows={10}
          placeholder={"知らない言葉\n重要な文\n〜てしまう"}
          className="w-full rounded-2xl border border-stone-300 bg-white p-4 text-sm"
        />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-stone-500">
            {itemCount} item{itemCount === 1 ? "" : "s"} detected.
          </p>

          <button
            type="submit"
            disabled={isPreviewing}
            className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:opacity-50"
          >
            {isPreviewing ? "Checking..." : "Check Items"}
          </button>
        </div>
      </form>
    </section>
  );
}
