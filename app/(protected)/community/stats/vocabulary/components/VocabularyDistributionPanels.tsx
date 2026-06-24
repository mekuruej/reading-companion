import type { ComponentProps } from "react";
import BarStrip from "./BarStrip";
import PieChart from "./PieChart";
import RecentWordsGrid from "./RecentWordsGrid";
import SectionBand from "./SectionBand";

type PieItem = {
  label: string;
  value: number;
  color: string;
};

type VocabularyBookMetric = {
  userBookId: string;
  title: string;
  wordsSaved: number;
  wordsPerPage: number | null;
};

type VocabularyTypeMetric = {
  bookType: string;
  pagesRead: number;
  wordsSaved: number;
  wordsPerPage: number | null;
};

type VocabularyDistributionPanelsProps = {
  selectedFilterLabel: string;
  sectionTone: string;
  wordsByBookTypePie: PieItem[];
  wordiestBooks: VocabularyBookMetric[];
  densestBooks: VocabularyBookMetric[];
  vocabularyTypeMetrics: VocabularyTypeMetric[];
  recentWords: ComponentProps<typeof RecentWordsGrid>["words"];
  formatDecimal: (value: number | null, digits?: number) => string;
};

export default function VocabularyDistributionPanels({
  selectedFilterLabel,
  sectionTone,
  wordsByBookTypePie,
  wordiestBooks,
  densestBooks,
  vocabularyTypeMetrics,
  recentWords,
  formatDecimal,
}: VocabularyDistributionPanelsProps) {
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
        <SectionBand
          eyebrow="Book type"
          title={`All-time words saved by book type — ${selectedFilterLabel}`}
          description="A word-weighted view of which kinds of books are adding the most vocabulary to your library."
          tone={sectionTone}
        >
          <PieChart items={wordsByBookTypePie} size={190} formatPercent={formatDecimal} />
        </SectionBand>

        <SectionBand
          eyebrow="Word volume"
          title={`Vocabulary-heavy books — ${selectedFilterLabel}`}
          description="These books have contributed the most saved words overall."
          tone={sectionTone}
        >
          <BarStrip
            items={wordiestBooks.map((item) => ({
              label: item.title,
              value: item.wordsSaved,
            }))}
            colorClass="bg-violet-500"
            valueSuffix=" words"
          />
        </SectionBand>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionBand
          eyebrow="Density"
          title={`Words per page — ${selectedFilterLabel}`}
          description="This is often a better difficulty signal than raw word count because it accounts for how much you read."
          tone={sectionTone}
        >
          <div className="space-y-3">
            {densestBooks.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                No word-density data yet.
              </div>
            ) : (
              densestBooks.map((item) => (
                <div key={item.userBookId}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-slate-700">{item.title}</span>
                    <span className="shrink-0 font-medium text-slate-900">
                      {formatDecimal(item.wordsPerPage)} / page
                    </span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{
                        width: `${Math.max(
                          6,
                          ((item.wordsPerPage ?? 0) /
                            Math.max(
                              1,
                              ...densestBooks.map((book) => book.wordsPerPage ?? 0)
                            )) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionBand>

        <SectionBand
          eyebrow="Book type table"
          title={`Vocabulary by category — ${selectedFilterLabel}`}
          description="A table version for comparing book categories without guessing from the chart."
          tone={sectionTone}
        >
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Words</th>
                  <th className="px-3 py-2">Pages</th>
                  <th className="px-3 py-2">Words/page</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {vocabularyTypeMetrics.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-sm text-slate-500" colSpan={4}>
                      No vocabulary data yet.
                    </td>
                  </tr>
                ) : (
                  vocabularyTypeMetrics.map((item) => (
                    <tr key={item.bookType}>
                      <td className="px-3 py-2 font-medium text-slate-900">
                        {item.bookType}
                      </td>
                      <td className="px-3 py-2 text-slate-700">{item.wordsSaved}</td>
                      <td className="px-3 py-2 text-slate-700">{item.pagesRead}</td>
                      <td className="px-3 py-2 text-slate-700">
                        {formatDecimal(item.wordsPerPage)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SectionBand>
      </div>

      <SectionBand
        eyebrow="Recent saves"
        title={`Recently saved words — ${selectedFilterLabel}`}
        description="A quick reminder of the newest words entering your reading life."
        tone={sectionTone}
      >
        <RecentWordsGrid words={recentWords} />
      </SectionBand>
    </>
  );
}