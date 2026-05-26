import type { ReactNode } from "react";

export default function SectionBand({
  eyebrow,
  title,
  description,
  children,
  tone = "border-slate-200 bg-white",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  tone?: string;
}) {
  return (
    <section className={`rounded-2xl border-2 p-4 shadow-sm ${tone}`}>
      <div className="mb-4">
        <div className="text-xs font-medium uppercase text-slate-600">
          {eyebrow}
        </div>
        <h2 className="mt-1 text-xl font-semibold text-slate-950">{title}</h2>
        {description ? (
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {description}
          </p>
        ) : null}
      </div>

      {children}
    </section>
  );
}