"use client";

import { useState } from "react";

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

type SupportBlockTone = "stone" | "amber" | "teal" | "sky";

type SupportBlockProps = {
  label: string;
  value: string | null | undefined;
  tone?: SupportBlockTone;
  collapseAfter?: number;
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

function supportBlockToneClass(tone: SupportBlockTone) {
  switch (tone) {
    case "amber":
      return "border-amber-200 bg-amber-50 text-amber-950";
    case "teal":
      return "border-teal-200 bg-teal-50 text-teal-950";
    case "sky":
      return "border-sky-200 bg-sky-50 text-sky-950";
    default:
      return "border-stone-200 bg-stone-50 text-stone-800";
  }
}

function supportBlockLabelClass(tone: SupportBlockTone) {
  switch (tone) {
    case "amber":
      return "text-amber-800";
    case "teal":
      return "text-teal-800";
    case "sky":
      return "text-sky-800";
    default:
      return "text-stone-500";
  }
}

function compactPreview(value: string, limit: number) {
  if (value.length <= limit) return value;
  return `${value.slice(0, limit).trimEnd()}...`;
}

function SupportBlock({
  label,
  value,
  tone = "stone",
  collapseAfter = 180,
}: SupportBlockProps) {
  const cleaned = value?.trim();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!cleaned) return null;

  const isLong = cleaned.length > collapseAfter;
  const visibleText = isLong && !isExpanded ? compactPreview(cleaned, collapseAfter) : cleaned;

  return (
    <section
      className={`mt-3 rounded-xl border px-3 py-2 text-sm leading-6 ${supportBlockToneClass(
        tone
      )}`}
    >
      <div
        className={`mb-1 text-[0.68rem] font-black uppercase tracking-[0.14em] ${supportBlockLabelClass(
          tone
        )}`}
      >
        {label}
      </div>
      <p className="whitespace-pre-wrap break-words">{visibleText}</p>
      {isLong ? (
        <button
          type="button"
          aria-expanded={isExpanded}
          onClick={(event) => {
            event.stopPropagation();
            setIsExpanded((current) => !current);
          }}
          className="mt-2 text-xs font-black text-stone-700 underline-offset-2 hover:underline"
        >
          {isExpanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </section>
  );
}

function SupportUrlBlock({ value }: { value: string | null | undefined }) {
  const cleaned = value?.trim();

  if (!cleaned) return null;

  return (
    <section className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm leading-6 text-sky-950">
      <div className="mb-1 text-[0.68rem] font-black uppercase tracking-[0.14em] text-sky-800">
        Link
      </div>
      <a
        href={cleaned}
        target="_blank"
        rel="noreferrer"
        onClick={(event) => event.stopPropagation()}
        className="inline-flex max-w-full font-semibold text-sky-800 underline-offset-2 hover:underline"
      >
        <span className="truncate">{cleaned}</span>
      </a>
    </section>
  );
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
          className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${itemTypeTone(
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
          <div className="break-words text-xl font-semibold leading-tight tracking-tight text-stone-900 sm:text-2xl">
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

        <SupportBlock label="Explanation" value={item.explanation} tone="stone" />
        <SupportBlock label="Translation" value={item.translation} tone="teal" />
        <SupportBlock label="Teacher Note" value={item.teacher_note} tone="amber" />
        <SupportUrlBlock value={item.support_url} />
      </div>
    </article>
  );
}
