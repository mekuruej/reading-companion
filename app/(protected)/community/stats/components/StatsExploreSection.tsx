import StatsNavCard from "./StatsNavCard";

type StatsExploreCard = {
  title: string;
  description: string;
  href: string;
  tag: string;
};

type StatsExploreSectionProps = {
  cards: StatsExploreCard[];
};

export default function StatsExploreSection({
  cards,
}: StatsExploreSectionProps) {
  return (
    <section className="mt-8">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-stone-900">
            Explore more stats
          </h2>

          <p className="mt-1 text-sm text-stone-600">
            Open a focused page for each part of your reading life.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <StatsNavCard
            key={card.title}
            title={card.title}
            description={card.description}
            href={card.href}
            tag={card.tag}
          />
        ))}
      </div>
    </section>
  );
}