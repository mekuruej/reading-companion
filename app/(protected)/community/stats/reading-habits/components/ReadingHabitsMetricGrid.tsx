import StatCard from "./StatCard";

type ReadingHabitsMetricGridProps = {
  activeDays: number;
  readingSessions: number;
  listeningSessions: number;
  pagesRead: number;
  tone: {
    statOne: string;
    statTwo: string;
    statThree: string;
    statFour: string;
  };
};

export default function ReadingHabitsMetricGrid({
  activeDays,
  readingSessions,
  listeningSessions,
  pagesRead,
  tone,
}: ReadingHabitsMetricGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <StatCard
        label="Active Days"
        value={activeDays}
        hint="Days with at least one reading session"
        tone={tone.statOne}
      />

      <StatCard
        label="Reading Sessions"
        value={readingSessions}
        hint="Fluid + curiosity sessions"
        tone={tone.statTwo}
      />

      <StatCard
        label="Listening Sessions"
        value={listeningSessions}
        hint="Ear-training sessions"
        tone={tone.statThree}
      />

      <StatCard
        label="Pages Read"
        value={pagesRead}
        hint="Fluid + curiosity page movement"
        tone={tone.statFour}
      />
    </div>
  );
}