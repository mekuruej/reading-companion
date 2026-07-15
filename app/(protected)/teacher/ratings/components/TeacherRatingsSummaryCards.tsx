type TeacherRatingsSummaryCardsProps = {
  totalCount: number;
  ratedCount: number;
  needsRatingCount: number;
  wouldTeachAgainCount: number;
};

export function TeacherRatingsSummaryCards({
  totalCount,
  ratedCount,
  needsRatingCount,
  wouldTeachAgainCount,
}: TeacherRatingsSummaryCardsProps) {
  const cards = [
    {
      label: "Books reviewed",
      value: ratedCount,
      note: "Have at least one teacher rating or note.",
      color: "border-emerald-200 bg-emerald-50 text-emerald-900",
    },
    {
      label: "Need ratings",
      value: needsRatingCount,
      note: "Finished books without teacher-facing review notes yet. DNF and dismissed books are skipped.",
      color: "border-amber-200 bg-amber-50 text-amber-900",
    },
    {
      label: "Strong lesson fit",
      value: wouldTeachAgainCount,
      note: "Rated 4 or 5 for student use.",
      color: "border-sky-200 bg-sky-50 text-sky-900",
    },
    {
      label: "Total shown",
      value: totalCount,
      note: "Books from you and linked learners.",
      color: "border-stone-200 bg-white text-stone-900",
    },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className={`rounded-3xl border p-5 shadow-sm ${card.color}`}>
          <p className="text-sm font-semibold opacity-80">{card.label}</p>
          <p className="mt-2 text-4xl font-black">{card.value}</p>
          <p className="mt-2 text-sm leading-5 opacity-80">{card.note}</p>
        </div>
      ))}
    </section>
  );
}
