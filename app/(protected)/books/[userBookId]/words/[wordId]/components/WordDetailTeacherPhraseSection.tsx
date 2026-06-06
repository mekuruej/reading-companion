import type { ReactNode } from "react";

type WordDetailTeacherPhraseSectionProps = {
  children: ReactNode;
};

export default function WordDetailTeacherPhraseSection({
  children,
}: WordDetailTeacherPhraseSectionProps) {
  return (
    <section className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
      <div className="mb-2 text-sm text-stone-500">
        Save short useful phrases from your reading here later.
      </div>

      {children}
    </section>
  );
}