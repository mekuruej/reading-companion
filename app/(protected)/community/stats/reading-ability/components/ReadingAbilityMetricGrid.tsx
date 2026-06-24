import StatCard from "./StatCard";

type ReadingAbilityMetricGridProps = {
  timedCoveragePercent: number | null;
  timedPages: number;
  untimedPages: number;
  fluidMinutesPerPage: number | null;
  curiosityMinutesPerPage: number | null;
  formatDecimal: (value: number | null, digits?: number) => string;
  tone: {
    statOne: string;
    statTwo: string;
    statThree: string;
  };
};

export default function ReadingAbilityMetricGrid({
  timedCoveragePercent,
  timedPages,
  untimedPages,
  fluidMinutesPerPage,
  curiosityMinutesPerPage,
  formatDecimal,
  tone,
}: ReadingAbilityMetricGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <StatCard
        label="Timed Page Coverage"
        value={timedCoveragePercent == null ? "—" : `${Math.round(timedCoveragePercent)}%`}
        hint={`${timedPages} timed pages · ${untimedPages} untimed pages`}
        tone={tone.statOne}
      />

      <StatCard
        label="Fluid Pace Per Page"
        value={fluidMinutesPerPage == null ? "—" : `${formatDecimal(fluidMinutesPerPage)} min/page`}
        hint="Time per page during fluid reading"
        tone={tone.statTwo}
      />

      <StatCard
        label="Curiosity Pace Per Page"
        value={
          curiosityMinutesPerPage == null
            ? "—"
            : `${formatDecimal(curiosityMinutesPerPage)} min/page`
        }
        hint="Time per page during curiosity reading"
        tone={tone.statThree}
      />
    </div>
  );
}