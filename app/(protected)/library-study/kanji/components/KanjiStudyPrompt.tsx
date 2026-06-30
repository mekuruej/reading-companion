type KanjiStudyPromptProps = {
  label: string;
  mainText: string;
  trailingHint?: string;
  contextWord?: string;
  targetKanji?: string;
  readingPrompt?: {
    before?: string;
    strong: string;
    ghost: string;
  };
};

export default function KanjiStudyPrompt({
  label,
  mainText,
  trailingHint = "",
  contextWord,
  targetKanji,
  readingPrompt,
}: KanjiStudyPromptProps) {
  const contextChars = contextWord ? Array.from(contextWord) : [];

  return (
    <div className="flex w-full flex-col items-center gap-1">
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <div className="text-5xl font-bold">
        {readingPrompt ? (
          <>
            {readingPrompt.before ? (
              <span className="text-slate-300">{readingPrompt.before}</span>
            ) : null}
            <span className="text-slate-950">{readingPrompt.strong}</span>
            <span className="text-slate-300">{readingPrompt.ghost}</span>
          </>
        ) : contextWord && targetKanji ? (
          <>
            {contextChars.map((ch, index) => (
              <span
                key={`${ch}-${index}`}
                className={ch === targetKanji ? "text-slate-950" : "text-slate-300"}
              >
                {ch}
              </span>
            ))}
          </>
        ) : (
          mainText
        )}

        {trailingHint ? (
          <span className="ml-1 font-medium text-slate-300">
            {trailingHint}
          </span>
        ) : null}
      </div>

    </div>
  );
}
