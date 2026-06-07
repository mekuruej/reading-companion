import DiscoveryNavCard from "./DiscoveryNavCard";

type DiscoveryCard = {
  title: string;
  href: string;
  eyebrow: string;
  description: string;
  className: string;
};

type DiscoveryCardGridProps = {
  cards: DiscoveryCard[];
};

export default function DiscoveryCardGrid({
  cards,
}: DiscoveryCardGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <DiscoveryNavCard
          key={card.href}
          href={card.href}
          eyebrow={card.eyebrow}
          title={card.title}
          description={card.description}
          className={card.className}
        />
      ))}
    </div>
  );
}