import BookVocabKatakanaBadge from "./BookVocabKatakanaBadge";

type BookVocabMobileCardProps = {
  hidden: boolean;
  surface: string | null | undefined;
  reading: string | null | undefined;
  meaning: string | null | undefined;

  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void | Promise<void>;
  onMoveDown: () => void | Promise<void>;

  onOpen: () => void;
};

export default function BookVocabMobileCard({
  hidden,
  surface,
  reading,
  meaning,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onOpen,
}: BookVocabMobileCardProps) {
  return (
    <article
      className={`rounded-2xl border bg-white p-4 shadow-sm ${
        hidden ? "border-stone-200 bg-stone-50 text-stone-400" : "border-stone-200 text-stone-900"
      }`}
    >
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
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

        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-700"
        >
          Word Detail
        </button>
      </div>
    </article>
  );
}
