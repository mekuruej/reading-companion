type AbilityCheckWordSkyCtaProps = {
  onOpenWordSky: () => void;
};

export default function AbilityCheckWordSkyCta({
  onOpenWordSky,
}: AbilityCheckWordSkyCtaProps) {
  return (
    <button
      type="button"
      onClick={onOpenWordSky}
      className="w-full rounded-2xl border border-sky-100 bg-[#f5fbff] px-4 py-3 text-left shadow-sm transition hover:border-sky-200 hover:bg-sky-50"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-sky-950">
            Need more words, or bogged down with difficult words?
          </div>

          <div className="text-xs leading-5 text-slate-500">
            Add easier words you may not need to look up in a book to your study.
          </div>
        </div>

        <div className="text-sm font-semibold text-sky-900">
          Open Word Sky
        </div>
      </div>
    </button>
  );
}