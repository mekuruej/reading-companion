import type { ReactNode } from "react";

type MonthlyChartPanelTone = "sky" | "violet";

type MonthlyChartPanelProps = {
  // Chart data and stat rules stay in page.tsx during the visual pass.
  tone: MonthlyChartPanelTone;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

const toneClasses: Record<
  MonthlyChartPanelTone,
  {
    border: string;
    eyebrow: string;
  }
> = {
  sky: {
    border: "border-sky-200",
    eyebrow: "text-sky-600",
  },
  violet: {
    border: "border-violet-200",
    eyebrow: "text-violet-600",
  },
};

export default function MonthlyChartPanel({
  tone,
  eyebrow,
  title,
  description,
  children,
}: MonthlyChartPanelProps) {
  const classes = toneClasses[tone];

  return (
    <div
      className={`rounded-3xl border ${classes.border} bg-white p-5 shadow-sm`}
    >
      <p
        className={`text-xs font-bold uppercase tracking-[0.18em] ${classes.eyebrow}`}
      >
        {eyebrow}
      </p>

      <h2 className="mt-2 text-2xl font-black text-stone-900">{title}</h2>

      <p className="mt-2 text-sm leading-6 text-stone-600">{description}</p>

      <div className="mt-5">{children}</div>
    </div>
  );
}