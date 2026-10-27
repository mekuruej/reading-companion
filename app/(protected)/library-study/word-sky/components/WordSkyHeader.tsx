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
    <div>
      <button
        type="button"
        onClick={onBackToStudy}
        className="mb-4 inline-flex text-sm font-semibold text-[var(--appearance-muted-text)] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--appearance-accent)] hover:text-[var(--appearance-text)]"
      >
        ← Back to Study Hub
      </button>

      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--appearance-border)] bg-[var(--appearance-surface)] p-4 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Word Sky</h1>
          <p className="mt-1 max-w-xl text-sm leading-6 text-[var(--appearance-muted-text)]">
            Pick words you can already read and change them to green.
            <br />
            These words will start to appear in your Ability Check and Library Practice, where you can
            <br />
            strengthen your reading and understanding as you move toward mastery.
            <br />
            <br />
            But remember: leveling up words naturally through your reading is still the
            ideal path!
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="rounded-full border border-[var(--appearance-border)] bg-[var(--appearance-surface)] px-3 py-2 text-sm font-medium text-[var(--appearance-text)]">
            {claimedCount} claimed
          </div>

          <div className="rounded-full border border-[var(--appearance-border)] bg-[var(--appearance-surface)] px-3 py-2 text-sm font-medium text-[var(--appearance-text)]">
            {wordPoolCount} in sky
          </div>
        </div>
      </div>
    </div>
  );
}
