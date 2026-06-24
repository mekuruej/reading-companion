import Link from "next/link";

type ReadingHabitsHeaderProps = {
  selectedTimeLabel: string;
  pageHeaderTone: string;
};

export default function ReadingHabitsHeader({
  selectedTimeLabel,
  pageHeaderTone,
}: ReadingHabitsHeaderProps) {
  return (
    <div>
      <Link
        href="/community/stats"
        className="text-sm font-semibold text-slate-500 hover:text-slate-900"
      >
        ← Back to Stats Home
      </Link>

      <div className={`mt-5 rounded-3xl border-2 p-5 shadow-sm ${pageHeaderTone}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
          Reading rhythm
        </p>

        <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
          Reading Habits
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
          A more visual look at your reading rhythm for {selectedTimeLabel.toLowerCase()}:
          modes, sessions, time, and daily rhythm.
        </p>
      </div>
    </div>
  );
}