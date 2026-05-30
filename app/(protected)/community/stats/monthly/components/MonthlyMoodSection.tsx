type MonthlyMoodSectionProps = {
  // Mood rules and value formatting stay in page.tsx during the visual pass.
  loading: boolean;
  title: string;
  description: string;
  readingTimeLabel: string;
  listeningTimeLabel: string;
  savedWordsLabel: string | number;
};

export default function MonthlyMoodSection({
  loading,
  title,
  description,
  readingTimeLabel,
  listeningTimeLabel,
  savedWordsLabel,
}: MonthlyMoodSectionProps) {
  return (
    <div className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">
        Monthly mood
      </p>

      <h2 className="mt-2 text-2xl font-black text-stone-900">{title}</h2>

      <p className="mt-2 text-sm leading-6 text-stone-600">{description}</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500">
            Reading
          </p>
          <p className="mt-2 text-xl font-black text-stone-900">
            {loading ? "—" : readingTimeLabel}
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500">
            Listening
          </p>
          <p className="mt-2 text-xl font-black text-stone-900">
            {loading ? "—" : listeningTimeLabel}
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500">
            Saved words
          </p>
          <p className="mt-2 text-xl font-black text-stone-900">
            {loading ? "—" : savedWordsLabel}
          </p>
        </div>
      </div>
    </div>
  );
}