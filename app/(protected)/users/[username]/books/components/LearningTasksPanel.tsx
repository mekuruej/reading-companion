import type { ReactNode } from "react";

type LearningTasksPanelProps = {
  title: string;
  children: ReactNode;
};

export default function LearningTasksPanel({
  title,
  children,
}: LearningTasksPanelProps) {
  return (
    <div className="mb-5 rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-emerald-950">
            {title}
          </div>

          <p className="mt-1 text-sm leading-6 text-slate-600">
            These are small study directions for your next reading or review
            session.
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-2">{children}</div>
    </div>
  );
}