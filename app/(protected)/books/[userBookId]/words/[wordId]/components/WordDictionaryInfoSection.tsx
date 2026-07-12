import type { ComponentProps, ReactNode } from "react";

import LibraryColorBadge from "@/components/LibraryColorBadge";

type LibraryColorBadgeProps = ComponentProps<typeof LibraryColorBadge>;

type WordDictionaryInfoSectionProps = {
  surface: string;
  reading: string | null;
  meaning: string | null;
  jlpt: string;
  isCommon: boolean | null;
  definitionNumber: number | null;
  repeatsInThisBook: number;
  hidden: boolean | null;
  colorInfo: {
    colorStatus: LibraryColorBadgeProps["colorStatus"];
    stageLabel: LibraryColorBadgeProps["stageLabel"];
  } | null;
  showStudyColor?: boolean;
  children?: ReactNode;
};

export default function WordDictionaryInfoSection({
  surface,
  reading,
  meaning,
  jlpt,
  isCommon,
  definitionNumber,
  repeatsInThisBook,
  hidden,
  colorInfo,
  showStudyColor = true,
  children,
}: WordDictionaryInfoSectionProps) {
  return (
    <section className="overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-sm">
      <div className="border-b border-amber-100 bg-amber-50 px-6 py-4">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
          Word Detail
        </div>
      </div>

      <div className="flex flex-col gap-5 p-6">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Word
          </div>
          <div className="break-words text-5xl font-black tracking-tight text-stone-950">
            {surface}
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Reading
          </div>
          <div className="text-3xl font-semibold text-stone-700">{reading || "—"}</div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
          {definitionNumber != null ? (
            <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-xs font-black text-stone-700 shadow-sm">
              Definition #{definitionNumber}
            </span>
          ) : null}
          <div className={definitionNumber != null ? "mt-2 text-xl font-semibold leading-8 text-stone-900" : "text-xl font-semibold leading-8 text-stone-900"}>
            {meaning || "—"}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-3">
            <div className="text-xs uppercase tracking-wide text-sky-700">JLPT</div>
            <div className="mt-1 text-lg font-black text-sky-950">
              {jlpt !== "NON-JLPT" ? jlpt : "Non-JLPT"}
            </div>
          </div>

          {showStudyColor ? (
            <div className="rounded-2xl border border-violet-200 bg-violet-50 p-3">
              <div className="mb-2 text-xs uppercase tracking-wide text-violet-700">Study color</div>
              {colorInfo ? (
                <LibraryColorBadge
                  colorStatus={colorInfo.colorStatus}
                  stageLabel={colorInfo.stageLabel}
                />
              ) : (
                <div className="text-sm font-semibold text-violet-900">No color yet</div>
              )}
            </div>
          ) : null}

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
            <div className="text-xs uppercase tracking-wide text-emerald-700">This book</div>
            <div className="mt-1 text-lg font-black text-emerald-950">
              {repeatsInThisBook} encounter{repeatsInThisBook === 1 ? "" : "s"}
            </div>
          </div>

          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3">
            <div className="text-xs uppercase tracking-wide text-rose-700">Frequency</div>
            <div className="mt-1 text-lg font-black text-rose-950">
              {isCommon ? "Common" : "Unlisted"}
            </div>
          </div>
        </div>

        {hidden ? (
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-800">
              Hidden
            </span>
          </div>
        ) : null}

        {children ? <div className="border-t border-amber-100 pt-4">{children}</div> : null}
      </div>
    </section>
  );
}
