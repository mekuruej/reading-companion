type WordSkyHeaderProps = {
  claimedCount: number;
  wordPoolCount: number;
  onBackToStudy: () => void;
};

export default function WordSkyHeader({
  claimedCount,
  wordPoolCount,
  onBackToStudy,
}: WordSkyHeaderProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/75 p-4 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold">Word Sky</h1>

        <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
          Pick words you think you can read. These words can automatically move into
          Ability Check and Library Practice, but encountering words through your
          reading is still the ideal path.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
          {claimedCount} claimed
        </div>

        <div className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
          {wordPoolCount} in sky
        </div>

        <button
          type="button"
          onClick={onBackToStudy}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Ability Check
        </button>
      </div>
    </div>
  );
}