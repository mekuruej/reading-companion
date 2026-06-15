type ItemType = "word" | "phrase" | "grammar" | "sentence" | "translation" | "note";
type SupportMode = "full" | "reading" | "meaning";

type TeacherFollowAlongPrepItem = {
  id: string;
  item_type: ItemType;
  surface_text: string | null;
  reading: string | null;
  meaning: string | null;
  chapter_name: string | null;
  teacher_note: string | null;
  explanation: string | null;
  translation: string | null;
  support_url?: string | null;
};

type TeacherFollowAlongPrepItemCardProps = {
  item: TeacherFollowAlongPrepItem;
  supportMode: SupportMode;
  isFaded: boolean;
  onSelect: () => void;
};

function itemTypeLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function itemTypeTone(value: ItemType) {
  switch (value) {
    case "word":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "phrase":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "grammar":
      return "border-violet-200 bg-violet-50 text-violet-800";
    case "sentence":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "translation":
      return "border-teal-200 bg-teal-50 text-teal-800";
    case "note":
      return "border-stone-200 bg-stone-50 text-stone-700";
    default:
      return "border-stone-200 bg-stone-50 text-stone-700";
  }
}

export function TeacherFollowAlongPrepItemCard({
  item,
  supportMode,
  isFaded,
  onSelect,
}: TeacherFollowAlongPrepItemCardProps) {
  const displaySurface = item.surface_text || itemTypeLabel(item.item_type);
  const showReading =
    (supportMode === "full" || supportMode === "reading") && item.reading;
  const showMeaning =
    (supportMode === "full" || supportMode === "meaning") && item.meaning;

  return (
    <article
      onClick={onSelect}
      className={`relative cursor-pointer rounded-2xl border px-4 py-3 transition ${
        isFaded
          ? "border-stone-200 bg-stone-50 opacity-35"
          : "border-stone-200 bg-white hover:bg-stone-50"
      }`}
    >
      <div className="mb-2 flex flex-wrap gap-2">
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${itemTypeTone(
            item.item_type
          )}`}
        >
          {itemTypeLabel(item.item_type)}
        </span>

        {item.chapter_name ? (
          <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-600">
            {item.chapter_name}
          </span>
        ) : null}
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <div className="text-xl font-semibold leading-tight tracking-tight text-stone-900 sm:text-2xl">
            {displaySurface}
          </div>

          {showReading ? (
            <div className="text-sm text-stone-500 sm:text-base">
              {item.reading}
            </div>
          ) : null}
        </div>

        {showMeaning ? (
          <div className="mt-2 text-sm leading-6 text-stone-700 sm:text-base">
            {item.meaning}
          </div>
        ) : null}

        {item.explanation ? (
          <p className="mt-3 text-sm leading-6 text-stone-600">
            {item.explanation}
          </p>
        ) : null}

        {item.translation ? (
          <p className="mt-3 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm leading-6 text-stone-700">
            {item.translation}
          </p>
        ) : null}

        {item.teacher_note ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
            {item.teacher_note}
          </p>
        ) : null}

        {item.support_url?.trim() ? (
          <a
            href={item.support_url}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="mt-3 inline-flex max-w-full items-center rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800 underline-offset-2 hover:bg-sky-100 hover:underline"
          >
            <span className="truncate">{item.support_url}</span>
          </a>
        ) : null}
      </div>
    </article>
  );
}
