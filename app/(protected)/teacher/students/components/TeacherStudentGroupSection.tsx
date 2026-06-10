import type { ReactNode } from "react";

type TeacherStudentGroupSectionProps<T> = {
  title: string;
  detail: string;
  items: readonly T[];
  renderStudent: (student: T) => ReactNode;
};

export default function TeacherStudentGroupSection<T>({
  title,
  detail,
  items,
  renderStudent,
}: TeacherStudentGroupSectionProps<T>) {
  return (
    <div>
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-base font-black text-stone-900">{title}</h3>
          <p className="text-sm text-stone-500">{detail}</p>
        </div>

        <span className="text-sm font-semibold text-stone-400">
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
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