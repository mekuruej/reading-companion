import type { ReactNode } from "react";

type TeacherStudentGroupSectionProps<T> = {
  title: string;
  detail: string;
  items: readonly T[];
  isOpen: boolean;
  nounLabel: string;
  onToggle: () => void;
  renderStudent: (student: T) => ReactNode;
};

export default function TeacherStudentGroupSection<T>({
  title,
  detail,
  items,
  isOpen,
  nounLabel,
  onToggle,
  renderStudent,
}: TeacherStudentGroupSectionProps<T>) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="mb-3 flex w-full flex-col gap-1 rounded-2xl px-2 py-2 text-left transition hover:bg-stone-50 sm:flex-row sm:items-end sm:justify-between"
        aria-expanded={isOpen}
      >
        <div>
          <h3 className="text-base font-black text-stone-900">
            <span className="mr-2 text-stone-400">{isOpen ? "▾" : "▸"}</span>
            {title}
          </h3>
          <p className="text-sm text-stone-500">{detail}</p>
        </div>

        <span className="text-sm font-semibold text-stone-400">
          {items.length} {items.length === 1 ? nounLabel : `${nounLabel}s`}
        </span>
      </button>

      {!isOpen ? null : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-5 text-sm text-stone-500">
          No {title.toLowerCase()} yet.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map(renderStudent)}
        </div>
      )}
    </div>
  );
}
