import MonthlyChartPanel from "./MonthlyChartPanel";
import PieChart, { type PieItem } from "./PieChart";

type MonthlyChartsSectionProps = {
  // Chart data and monthly stat rules stay in page.tsx during the visual pass.
  timeByModePie: PieItem[];
  bookTypePie: PieItem[];
  totalEngagementMinutesLabel: string;
  pagesReadLabel: string;
  formatTimeValue: (value: number) => string;
  formatPageValue: (value: number) => string;
};

export default function MonthlyChartsSection({
  timeByModePie,
  bookTypePie,
  totalEngagementMinutesLabel,
  pagesReadLabel,
  formatTimeValue,
  formatPageValue,
}: MonthlyChartsSectionProps) {
  return (
    <section className="mt-8 grid gap-4 lg:grid-cols-2">
      <MonthlyChartPanel
        tone="sky"
        eyebrow="Reading time"
        title="Time by mode"
        description="Reading time counts Curiosity and Fluid sessions. Listening is shown separately so it does not blur your reading pace."
      >
        <PieChart
          items={timeByModePie}
          centerLabel="Time"
          totalLabel={totalEngagementMinutesLabel}
          valueLabel={formatTimeValue}
        />
      </MonthlyChartPanel>

      <MonthlyChartPanel
        tone="violet"
        eyebrow="Book mix"
        title="Book types read this month"
        description="This chart uses page movement from Fluid and Curiosity sessions, so listening is not included here."
      >
        <PieChart
          items={bookTypePie}
          centerLabel="Pages"
          totalLabel={pagesReadLabel}
          valueLabel={formatPageValue}
        />
      </MonthlyChartPanel>
    </section>
  );
}