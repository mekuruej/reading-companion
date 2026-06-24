import type { ComponentProps } from "react";
import BarStrip from "./BarStrip";
import PieChart from "./PieChart";
import ReaderFitTable from "./ReaderFitTable";
import SectionBand from "./SectionBand";

type CountItem = {
  label: string;
  value: number;
};

type PieItem = CountItem & {
  color: string;
};

type BookDifficultyDistributionPanelsProps = {
  selectedTimeLabel: string;
  sectionTone: string;
  softSectionTone: string;
  bookTypePie: PieItem[];
  difficultyPie: PieItem[];
  pageBucketCounts: CountItem[];
  overallRatingCounts: CountItem[];
  hardestBookItems: CountItem[];
  easiestBookItems: CountItem[];
  readerFitRows: ComponentProps<typeof ReaderFitTable>["rows"];
  bookTypeLabel: ComponentProps<typeof ReaderFitTable>["bookTypeLabel"];
  formatRating: ComponentProps<typeof ReaderFitTable>["formatRating"];
  formatPercent: ComponentProps<typeof PieChart>["formatPercent"];
};

export default function BookDifficultyDistributionPanels({
  selectedTimeLabel,
  sectionTone,
  softSectionTone,
  bookTypePie,
  difficultyPie,
  pageBucketCounts,
  overallRatingCounts,
  hardestBookItems,
  easiestBookItems,
  readerFitRows,
  bookTypeLabel,
  formatRating,
  formatPercent,
}: BookDifficultyDistributionPanelsProps) {
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
        <SectionBand
          eyebrow={`Book types — ${selectedTimeLabel}`}
          title="Book types in your difficulty data"
          description="A count-based view of the kinds of books included in this reader-fit picture."
          tone={sectionTone}
        >
          <PieChart items={bookTypePie} size={190} formatPercent={formatPercent} />
        </SectionBand>

        <SectionBand
          eyebrow={`Difficulty — ${selectedTimeLabel}`}
          title="Difficulty ratings"
          description="How your finished books are distributed across your own ratings. Here, 1 means easiest and 5 means hardest."
          tone={softSectionTone}
        >
          <PieChart items={difficultyPie} size={190} formatPercent={formatPercent} />
        </SectionBand>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionBand
          eyebrow={`Page count — ${selectedTimeLabel}`}
          title="Book length"
          description="A simple look at which length of book you prefer."
          tone={sectionTone}
        >
          <BarStrip items={pageBucketCounts} colorClass="bg-sky-500" valueSuffix=" books" />
        </SectionBand>

        <SectionBand
          eyebrow={`Entertainment — ${selectedTimeLabel}`}
          title="Entertainment rating spread"
          description="A simple view of how your enjoyment ratings are distributed."
          tone={sectionTone}
        >
          <BarStrip
            items={overallRatingCounts}
            colorClass="bg-indigo-500"
            valueSuffix=" books"
          />
        </SectionBand>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionBand
          eyebrow={`Hardest — ${selectedTimeLabel}`}
          title="Books that pushed back"
          description="A representative mix of finished books rated 5 for difficulty. These are the books that pushed back most, relative to their book types."
          tone={sectionTone}
        >
          <BarStrip items={hardestBookItems} colorClass="bg-red-500" valueSuffix="" />
        </SectionBand>

        <SectionBand
          eyebrow={`Easiest — ${selectedTimeLabel}`}
          title="Books that felt comfortable"
          description="A representative mix of finished books rated 1 for difficulty. These are the books that felt most comfortable, relative to their book types."
          tone={sectionTone}
        >
          <BarStrip items={easiestBookItems} colorClass="bg-emerald-500" valueSuffix="" />
        </SectionBand>
      </div>

      <SectionBand
        eyebrow={`Reader-fit table — ${selectedTimeLabel}`}
        title="Difficulty and enjoyment by book"
        description="A compact table of finished books with difficulty and entertainment ratings. Keep in mind these ratings are most useful relative to each book’s type."
        tone={sectionTone}
      >
        <ReaderFitTable
          rows={readerFitRows}
          bookTypeLabel={bookTypeLabel}
          formatRating={formatRating}
        />
      </SectionBand>
    </>
  );
}