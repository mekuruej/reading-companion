import StatCard from "./StatCard";

type VocabularyMetricGridProps = {
  wordsSaved: number;
  uniqueWords: number;
  monthlyWordsSaved: number;
  monthlyUniqueWords: number;
  wordsPerPage: number | null;
  pagesRead: number;
  formatDecimal: (value: number | null, digits?: number) => string;
  tone: {
    statOne: string;
    statTwo: string;
    statThree: string;
    statFour: string;
  };
};

export default function VocabularyMetricGrid({
  wordsSaved,
  uniqueWords,
  monthlyWordsSaved,
  monthlyUniqueWords,
  wordsPerPage,
  pagesRead,
  formatDecimal,
  tone,
}: VocabularyMetricGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <StatCard
        label="Words Saved"
        value={wordsSaved}
        hint="All-time saved vocabulary"
        tone={tone.statOne}
      />

      <StatCard
        label="Unique Words"
        value={uniqueWords}
        hint="Surface + reading + meaning"
        tone={tone.statTwo}
      />

      <StatCard
        label="This Month"
        value={monthlyWordsSaved}
        hint={`${monthlyUniqueWords} unique this month`}
        tone={tone.statThree}
      />

      <StatCard
        label="Words Per Page"
        value={wordsPerPage == null ? "—" : formatDecimal(wordsPerPage)}
        hint={`${pagesRead} pages counted`}
        tone={tone.statFour}
      />
    </div>
  );
}