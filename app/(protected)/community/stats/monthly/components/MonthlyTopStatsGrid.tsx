import MonthlyStatCard from "./MonthlyStatCard";

type MonthlyTopStatsGridProps = {
  // Values are calculated in page.tsx so this component stays display-only.
  items: [string, string | number][];
  loading: boolean;
};

export default function MonthlyTopStatsGrid({
  items,
  loading,
}: MonthlyTopStatsGridProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(([label, value]) => (
        <MonthlyStatCard
          key={label}
          label={label}
          value={value}
          loading={loading}
        />
      ))}
    </section>
  );
}