import StatCard from "./StatCard";

type BookDifficultyMetricGridProps = {
  totalBooks: number;
  finishedBooks: number;
  dnfBooks: number;
  averageDifficulty: string;
  ratedDifficulty: number;
  averageOverall: string;
  ratedBooks: number;
  tone: {
    statOne: string;
    statTwo: string;
    statThree: string;
    statFour: string;
  };
};

export default function BookDifficultyMetricGrid({
  totalBooks,
  finishedBooks,
  dnfBooks,
  averageDifficulty,
  ratedDifficulty,
  averageOverall,
  ratedBooks,
  tone,
}: BookDifficultyMetricGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <StatCard
        label="Books Tracked"
        value={totalBooks}
        hint={`${finishedBooks} finished · ${dnfBooks} DNF`}
        tone={tone.statOne}
      />

      <StatCard
        label="Avg Difficulty"
        value={averageDifficulty}
        hint={`${ratedDifficulty} finished ratings · 1 easy / 5 hard`}
        tone={tone.statTwo}
      />

      <StatCard
        label="Avg Entertainment"
        value={averageOverall}
        hint="Finished-book entertainment ratings"
        tone={tone.statThree}
      />

      <StatCard
        label="Rated Books"
        value={ratedBooks}
        hint="Finished books with ease or entertainment ratings"
        tone={tone.statFour}
      />
    </div>
  );
}