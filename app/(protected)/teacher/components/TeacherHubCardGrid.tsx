import Link from "next/link";

type TeacherHubCard = {
  title: string;
  href: string;
  eyebrow: string;
  description: string;
};

type TeacherHubCardGridProps = {
  cards: TeacherHubCard[];
};

export function TeacherHubCardGrid({ cards }: TeacherHubCardGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Link key={card.title} href={card.href}>
          <div className="h-full rounded-3xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
              {card.eyebrow}
            </p>

            <h2 className="mt-3 text-xl font-black text-stone-900">
              {card.title}
            </h2>

            <p className="mt-3 text-sm leading-6 text-stone-600">
              {card.description}
            </p>

            <p className="mt-4 text-sm font-semibold text-stone-900">
              Open →
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}