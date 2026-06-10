type BulkFieldName = "page" | "chapterNumber" | "chapterName";
type BulkApplyMode = "blank" | "all";

type TeacherPrepBulkFieldsPanelProps = {
  pageNumber: string;
  onPageNumberChange: (value: string) => void;
  chapterNumber: string;
  onChapterNumberChange: (value: string) => void;
  chapterName: string;
  onChapterNameChange: (value: string) => void;
  chapterNameLabel: string;
  onApplyField: (
    field: BulkFieldName,
    value: string,
    mode: BulkApplyMode
  ) => void;
};

function BulkFieldInput({
  label,
  value,
  onChange,
  field,
  onApplyField,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  field: BulkFieldName;
  onApplyField: TeacherPrepBulkFieldsPanelProps["onApplyField"];
}) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-xs text-gray-500">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded border p-2 text-sm"
      />

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => onApplyField(field, value, "blank")}
          className="rounded-lg border border-stone-200 bg-stone-50 px-2 py-1 text-xs font-semibold text-stone-700"
        >
          Fill blanks
        </button>

        <button
          type="button"
          onClick={() => onApplyField(field, value, "all")}
          className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs font-semibold text-stone-700"
        >
          Apply all
        </button>
      </div>
    </label>
  );
}

export default function TeacherPrepBulkFieldsPanel({
  pageNumber,
  onPageNumberChange,
  chapterNumber,
  onChapterNumberChange,
  chapterName,
  onChapterNameChange,
  chapterNameLabel,
  onApplyField,
}: TeacherPrepBulkFieldsPanelProps) {
  return (
    <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-black text-stone-900">Apply fields</h3>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <BulkFieldInput
          label="Page"
          value={pageNumber}
          onChange={onPageNumberChange}
          field="page"
          onApplyField={onApplyField}
        />

        <BulkFieldInput
          label="Chapter #"
          value={chapterNumber}
          onChange={onChapterNumberChange}
          field="chapterNumber"
          onApplyField={onApplyField}
        />

        <BulkFieldInput
          label={chapterNameLabel}
          value={chapterName}
          onChange={onChapterNameChange}
          field="chapterName"
          onApplyField={onApplyField}
        />
      </div>
    </section>
  );
}