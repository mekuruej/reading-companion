import type { ReactNode } from "react";

type TeacherAlertPanelProps = {
  eyebrow: string;
  title: string;
  children: ReactNode;
};

export function TeacherAlertPanel({
  eyebrow,
  title,
  children,
}: TeacherAlertPanelProps) {
  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
        {eyebrow}
      </p>

      <h3 className="mt-2 text-xl font-black text-stone-900">{title}</h3>

      {children}
    </div>
  );
}