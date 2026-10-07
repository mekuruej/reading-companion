import type { ReactNode } from "react";
import { useState } from "react";

type LearningTasksPanelProps = {
  taskCount: number;
  children: ReactNode;
};

export default function LearningTasksPanel({
  taskCount,
  children,
}: LearningTasksPanelProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-emerald-950">
          You have {taskCount} assigned {taskCount === 1 ? "task" : "tasks"}
        </p>
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="text-xs font-semibold text-emerald-800 underline decoration-emerald-300 underline-offset-4"
        >
          {expanded ? "Hide tasks" : "Show tasks"}
        </button>
      </div>

      {expanded ? (
        <>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            These are small study directions for your next reading or review session.
          </p>
          <div className="mt-3 grid gap-2">{children}</div>
        </>
      ) : null}
    </section>
  );
}
