import { useId } from "react";

type ChapterNameComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  chapterOptions: readonly string[];
  label?: string;
  placeholder?: string;
  helperText?: string;
  disabled?: boolean;
  className?: string;
  labelClassName?: string;
  inputClassName?: string;
};

export default function ChapterNameCombobox({
  value,
  onChange,
  chapterOptions,
  label = "Chapter name",
  placeholder = "Chapter name",
  helperText = "Choose an existing chapter or type a new one.",
  disabled = false,
  className = "",
  labelClassName = "mb-1 block text-sm font-medium text-stone-700",
  inputClassName = "w-full rounded border bg-white px-3 py-2 text-sm",
}: ChapterNameComboboxProps) {
  const listId = useId();

  return (
    <label className={`block ${className}`}>
      {label ? <span className={labelClassName}>{label}</span> : null}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={(event) => onChange(event.target.value.trim())}
        placeholder={placeholder}
        disabled={disabled}
        list={listId}
        className={inputClassName}
      />
      <datalist id={listId}>
        {chapterOptions.map((chapterName) => (
          <option key={chapterName} value={chapterName} />
        ))}
      </datalist>
      {helperText ? (
        <span className="mt-1 block text-xs leading-5 text-stone-500">
          {helperText}
        </span>
      ) : null}
    </label>
  );
}
