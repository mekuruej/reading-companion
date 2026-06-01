import type { ReactNode } from "react";

type ReadingColorSupportSectionProps = {
  // Limbo values and support-state calculations stay in page.tsx.
  children: ReactNode;
};

export default function ReadingColorSupportSection({
  children,
}: ReadingColorSupportSectionProps) {
  return (
    <section className="mt-8 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
          Between gates
        </p>

        <h2 className="mt-2 text-2xl font-black text-stone-900">
          Words waiting for support
        </h2>

        <p className="mt-2 text-sm leading-6 text-stone-600">
          Limbo words are not failed words. They sit between Green and Blue
          after a missed Reading Gate, or between Blue and Purple after a missed
          Meaning Gate.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">{children}</div>
    </section>
  );
}