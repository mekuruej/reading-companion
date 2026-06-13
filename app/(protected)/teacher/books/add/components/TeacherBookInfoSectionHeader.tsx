type TeacherBookInfoSectionHeaderProps = {
  missingFields: string[];
};

export function TeacherBookInfoSectionHeader({
  missingFields,
}: TeacherBookInfoSectionHeaderProps) {
  const hasMissingFields = missingFields.length > 0;

  return (
    <div className="flex flex-col gap-3 border-b border-stone-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-stone-900">
          Shared book info
        </h2>
        <p className="text-sm leading-6 text-stone-600">
          Review the shared catalog details for this book. These details can be
          reused across readers.
        </p>
      </div>

      <div
        className={`rounded-full border px-3 py-1 text-xs font-semibold ${
          hasMissingFields
            ? "border-amber-200 bg-amber-50 text-amber-800"
            : "border-emerald-200 bg-emerald-50 text-emerald-700"
        }`}
      >
        {hasMissingFields
          ? `${missingFields.length} core field${
              missingFields.length === 1 ? "" : "s"
            } missing`
          : "Core details complete"}
      </div>
    </div>
  );
}