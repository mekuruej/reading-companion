import type { ReactNode } from "react";

type WordDictionaryInfoSectionProps = {
  surface: string;
  reading: string | null;
  jlpt: string;
  isCommon: boolean | null;
  children: ReactNode;
};

export default function WordDictionaryInfoSection({
  surface,
  reading,
  jlpt,
  isCommon,
  children,
}: WordDictionaryInfoSectionProps) {
  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="mb-4 text-lg font-semibold">Dictionary Info</div>

      <div className="flex flex-col gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Word
          </div>
          <div className="break-words text-4xl font-bold">{surface}</div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Reading
          </div>
          <div className="text-2xl font-medium">{reading || "—"}</div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          {jlpt !== "NON-JLPT" ? (
            <span className="rounded-full bg-gray-100 px-3 py-1 text-[17px] font-medium leading-none text-gray-800">
              {jlpt}
            </span>
          ) : null}

          {isCommon ? <span className="text-gray-500">Common</span> : null}
        </div>

        {children}
      </div>
    </section>
  );
}