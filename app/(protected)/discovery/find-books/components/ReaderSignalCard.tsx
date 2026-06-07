import CompactRatingPill from "./CompactRatingPill";

type ReaderSignal = {
  id: string;
  readerLevel: string | null;
  readerAdvice: string | null;
  difficultyRating: number | null;
  entertainmentRating: number | null;
};

type ReaderSignalCardProps = {
  signal: ReaderSignal;
  bookType: string | null;
  bookTypeLabel: (value: string | null | undefined) => string;
  formatReaderLevel: (value: string | null | undefined) => string;
  formatValue: (value: number) => string;
};

export default function ReaderSignalCard({
  signal,
  bookType,
  bookTypeLabel,
  formatReaderLevel,
  formatValue,
}: ReaderSignalCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 border-l-4 border-l-slate-300 bg-white px-3 py-2">
      <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <div className="text-sm font-semibold text-slate-900">
              {formatReaderLevel(signal.readerLevel)} Reader
            </div>
          </div>

          {signal.readerAdvice ? (
            <div className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-600">
              <span className="font-semibold text-slate-900">
                Advice to the reader:
              </span>{" "}
              {signal.readerAdvice}
            </div>
          ) : null}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <CompactRatingPill
            label={`${bookTypeLabel(bookType)} Difficulty`}
            value={signal.difficultyRating}
            tone="sky"
            formatValue={formatValue}
          />

          <CompactRatingPill
            label="Entertainment"
            value={signal.entertainmentRating}
            tone="amber"
            formatValue={formatValue}
          />
        </div>
      </div>
    </div>
  );
}