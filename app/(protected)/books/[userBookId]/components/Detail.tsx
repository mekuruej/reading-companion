type DetailProps = {
  label: string;
  value: any;
  editing: boolean;
  inputValue: string;
  setInputValue: (value: string) => void;
  placeholder?: string;
};

export default function Detail({
  label,
  value,
  editing,
  inputValue,
  setInputValue,
  placeholder,
}: DetailProps) {
  const display =
    value === null || value === undefined || value === "" ? "—" : String(value);

  return (
    <div className="rounded border bg-white p-3">
      <div className="text-stone-600">{label}</div>

      {!editing ? (
        <div className="font-medium">{display}</div>
      ) : (
        <input
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          placeholder={placeholder}
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
        />
      )}
    </div>
  );
}