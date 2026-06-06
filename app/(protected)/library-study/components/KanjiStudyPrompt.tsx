type KanjiStudyPromptProps = {
  label: string;
  mainText: string;
  trailingHint?: string;
};

export default function KanjiStudyPrompt({
  label,
  mainText,
  trailingHint = "",
}: KanjiStudyPromptProps) {
  return (
    <div className="flex w-full flex-col items-center gap-1">
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <div className="text-5xl font-bold">
        {mainText}

        {trailingHint ? (
          <span className="ml-1 font-medium text-slate-300">
            {trailingHint}
          </span>
        ) : null}
      </div>
    </div>
  );
}