import { KeyboardEvent, useEffect, useState } from "react";
import BookVocabKatakanaBadge from "./BookVocabKatakanaBadge";

type BookVocabMobileCardProps = {
  hidden: boolean;
  surface: string | null | undefined;
  reading: string | null | undefined;
  meaning: string | null | undefined;
  pageNumber: number | null | undefined;
  readOnly?: boolean;
  onPageChange?: (value: string) => void | Promise<void>;

  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void | Promise<void>;
  onMoveDown: () => void | Promise<void>;

  onOpen: () => void;
  onDelete: () => void;
};

export default function BookVocabMobileCard({
  hidden,
  surface,
  reading,
  meaning,
  pageNumber,
  readOnly = false,
  onPageChange,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onOpen,
  onDelete,
}: BookVocabMobileCardProps) {
  const [pageDraft, setPageDraft] = useState(pageNumber == null ? "" : String(pageNumber));

  useEffect(() => {
    setPageDraft(pageNumber == null ? "" : String(pageNumber));
  }, [pageNumber]);

  async function commitPage() {
    const nextValue = pageDraft.trim();
    const currentValue = pageNumber == null ? "" : String(pageNumber);
    if (nextValue === currentValue) return;
    await onPageChange?.(nextValue);
  }

  function handlePageKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }
    if (event.key === "Escape") {
      setPageDraft(pageNumber == null ? "" : String(pageNumber));
      event.currentTarget.blur();
    }
  }

  return (
    <article
      className={`rounded-2xl border bg-white p-4 shadow-sm ${
        hidden ? "border-stone-200 bg-stone-50 text-stone-400" : "border-stone-200 text-stone-900"
      }`}
    >
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
        <button
          type="button"
          onClick={onOpen}
          className="shrink-0 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-black text-sky-800 transition hover:bg-sky-100"
          title="Open word detail"
        >
          Detail
        </button>
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-2xl font-semibold leading-snug text-stone-950">
          <span className="break-words">{surface || "—"}</span>
          <BookVocabKatakanaBadge surface={surface} />
        </div>

        <div className="break-words text-base font-medium leading-6 text-stone-600">
          {reading || "—"}
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-stone-50 px-3 py-2 text-sm leading-6 text-stone-800">
        <div className="break-words">{meaning || "—"}</div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {readOnly ? null : (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => void onMoveUp()}
              disabled={!canMoveUp}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-white text-sm font-black text-stone-700 transition hover:bg-stone-50 disabled:opacity-30"
              title="Move up"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => void onMoveDown()}
              disabled={!canMoveDown}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-white text-sm font-black text-stone-700 transition hover:bg-stone-50 disabled:opacity-30"
              title="Move down"
            >
              ↓
            </button>
          </div>
        )}

        {readOnly || !onPageChange ? (
          <div
            className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-black uppercase tracking-wide text-stone-500"
            title="Words can be reordered within the same page"
          >
            Page {pageNumber ?? "—"}
          </div>
        ) : (
          <label className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-black uppercase tracking-wide text-stone-500">
            Page
            <input
              type="number"
              value={pageDraft}
              onChange={(event) => setPageDraft(event.target.value)}
              onBlur={() => void commitPage()}
              onKeyDown={handlePageKeyDown}
              className="w-16 rounded-lg border border-stone-200 bg-white px-2 py-1 text-center text-sm font-semibold normal-case tracking-normal text-stone-700 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
              aria-label="Page number"
            />
          </label>
        )}

        {readOnly ? null : (
          <button
            type="button"
            onClick={onDelete}
            className="min-w-0 flex-1 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
          >
            Delete
          </button>
        )}
      </div>
    </article>
  );
}
