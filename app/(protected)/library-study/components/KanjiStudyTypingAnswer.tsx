import { useEffect, useRef } from "react";

type KanjiStudyTypingAnswerProps = {
  value: string;
  disabled: boolean;
  placeholder: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export default function KanjiStudyTypingAnswer({
  value,
  disabled,
  placeholder,
  onChange,
  onSubmit,
}: KanjiStudyTypingAnswerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (disabled) return;
    inputRef.current?.focus();
  }, [disabled]);

  return (
    <form
      className="flex w-full max-w-sm flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <input
        ref={inputRef}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-2xl font-semibold text-slate-950 outline-none transition focus:border-slate-950 disabled:bg-slate-50"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
      />

      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        Check
      </button>
    </form>
  );
}
