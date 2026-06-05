type AbilityCheckReadinessPromptProps = {
  surface: string;
  promptClassName: string;
  onReadyForReadingGate: () => void;
  onNeedsSupport: () => void;
};

export default function AbilityCheckReadinessPrompt({
  surface,
  promptClassName,
  onReadyForReadingGate,
  onNeedsSupport,
}: AbilityCheckReadinessPromptProps) {
  return (
    <>
      <div className={promptClassName}>
        READINESS
      </div>

      <div className="text-center text-5xl font-bold leading-tight">
        {surface}
      </div>

      <p className="max-w-md text-center text-sm leading-6 text-slate-500">
        Does this word feel ready for a real reading check?
      </p>

      <div className="grid w-full max-w-md gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={onReadyForReadingGate}
          className="rounded-2xl border border-emerald-200 bg-emerald-100 px-4 py-3 text-sm font-black text-emerald-950 shadow-sm transition hover:bg-emerald-50"
        >
          Ready for Reading Gate
        </button>

        <button
          type="button"
          onClick={onNeedsSupport}
          className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          Not yet
          <span className="mt-1 block text-[10px] font-normal text-slate-500">
            Give it more reading support
          </span>
        </button>
      </div>
    </>
  );
}