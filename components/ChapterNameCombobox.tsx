import { useId, useMemo, useState } from "react";

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
  showSavedChapterSelect?: boolean;
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
  const inputId = useId();
  const [showOptions, setShowOptions] = useState(false);
  const savedChapterOptions = useMemo(() => {
    const seen = new Set<string>();

    return chapterOptions
      .filter((chapterName) => {
        const key = chapterName.trim();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [chapterOptions]);
  const hasOptions = savedChapterOptions.length > 0;

  return (
    <div className={`block ${className}`}>
      {label ? (
        <label htmlFor={inputId} className={labelClassName}>
          {label}
        </label>
      ) : null}
      <div className="relative">
        <div className="flex gap-2">
          <input
            id={inputId}
            name={`${inputId}-chapter-name`}
            value={value}
            onChange={(event) => {
              onChange(event.target.value);
              setShowOptions(true);
            }}
            onFocus={() => setShowOptions(true)}
            onBlur={(event) => {
              onChange(event.target.value.trim());
              window.setTimeout(() => setShowOptions(false), 100);
            }}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            className={inputClassName}
          />
          {hasOptions ? (
            <button
              type="button"
              aria-label="Show previous chapters"
              disabled={disabled}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setShowOptions((current) => !current)}
              className="shrink-0 rounded border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 shadow-sm hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              v
            </button>
          ) : null}
        </div>

        {hasOptions && showOptions && !disabled ? (
          <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-stone-200 bg-white p-1 shadow-lg">
            {savedChapterOptions.map((chapterName) => (
              <button
                key={chapterName}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(chapterName);
                  setShowOptions(false);
                }}
                className="block w-full rounded-md px-3 py-2 text-left text-sm text-stone-800 hover:bg-stone-100"
              >
                {chapterName}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {helperText ? (
        <span className="mt-1 block text-xs leading-5 text-stone-500">
          {helperText}
        </span>
      ) : null}
    </div>
  );
}
