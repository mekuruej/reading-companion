function formatDateFieldYmd(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

type DateFieldProps = {
  label: string;
  value: Date | null;
  editing: boolean;
  inputValue: string;
  setInputValue: (value: string) => void;
};

export default function DateField({
  label,
  value,
  editing,
  inputValue,
  setInputValue,
}: DateFieldProps) {
  return (
    <div className="rounded border bg-white p-3 text-sm">
      <div className="text-stone-600">{label}</div>

      {!editing ? (
        <div className="mt-1 font-medium">
          {value ? formatDateFieldYmd(value) : "—"}
        </div>
      ) : (
        <input
          type="date"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          className="mt-1 w-full rounded border px-2 py-1"
        />
      )}
    </div>
  );
}