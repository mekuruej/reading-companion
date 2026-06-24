import SectionBand from "./SectionBand";
import SmallMetricCard from "./SmallMetricCard";

export type VocabularyRhythmDay = {
  day: string;
  words: number;
  studyEvents: number;
  correct: number;
  incorrect: number;
  reviewed: number;
  skipped: number;
};

export type VocabularyRhythmSummary = {
  savedWordDays: number;
  studyDays: number;
  overlapDays: number;
  activeVocabularyDays: number;
  wordsSaved: number;
  studyEvents: number;
};

type StudyAnswerMixItem = {
  label: string;
  value: number;
  colorClass: string;
};

type BookStudyItem = {
  userBookId: string;
  title: string;
  total: number;
  correct: number;
  incorrect: number;
  studyTypeLabel: string;
  studyTypeDetail: string | null;
  accuracyPercent: number | null;
};

type StudySignalsForRhythm = {
  studiedWords: number;
  studiedBooks: number;
  accuracyPercent: number | null;
  answerMixItems: StudyAnswerMixItem[];
  bookStudyItems: BookStudyItem[];
};

type VocabularyRhythmPanelProps = {
  selectedFilterLabel: string;
  vocabularyRhythmWindowLabel: string;
  tone: string;
  visibleActivity: VocabularyRhythmDay[];
  summary: VocabularyRhythmSummary;
  studySignals: StudySignalsForRhythm;
  showFullVocabularyRhythm: boolean;
  formatPercent: (value: number | null) => string;
  onToggleFullVocabularyRhythm: () => void;
};

function vocabularyRhythmColorClass(item: VocabularyRhythmDay) {
  const hasSavedWords = item.words > 0;
  const hasStudy = item.studyEvents > 0;
  const intensity = item.words + item.studyEvents;

  if (!hasSavedWords && !hasStudy) return "bg-slate-100";

  if (hasSavedWords && hasStudy) {
    if (intensity < 5) return "bg-violet-300";
    if (intensity < 12) return "bg-violet-500";
    return "bg-violet-700";
  }

  if (hasStudy) {
    if (intensity < 5) return "bg-sky-300";
    if (intensity < 12) return "bg-sky-500";
    return "bg-sky-700";
  }

  if (intensity < 3) return "bg-amber-200";
  if (intensity < 8) return "bg-amber-400";
  return "bg-amber-600";
}

function VocabularyRhythmLegend() {
  return (
    <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full bg-amber-400" />
        Saved words
      </div>

      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full bg-sky-500" />
        Studied
      </div>

      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full bg-violet-500" />
        Saved + studied
      </div>
    </div>
  );
}

export default function VocabularyRhythmPanel({
  selectedFilterLabel,
  vocabularyRhythmWindowLabel,
  tone,
  visibleActivity,
  summary,
  studySignals,
  showFullVocabularyRhythm,
  formatPercent,
  onToggleFullVocabularyRhythm,
}: VocabularyRhythmPanelProps) {
  return (
    <SectionBand
      eyebrow="Vocabulary Rhythm"
      title={`Saved words → study rhythm — ${selectedFilterLabel}`}
      description={`${vocabularyRhythmWindowLabel}: which days you saved vocabulary and which days you came back to study it. This respects the book category filter above.`}
      tone={tone}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="rounded-full border border-violet-200 bg-white/80 px-3 py-1 text-xs font-semibold text-violet-800">
          Showing: {vocabularyRhythmWindowLabel}
        </div>

        <button
          type="button"
          onClick={onToggleFullVocabularyRhythm}
          className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          {showFullVocabularyRhythm ? "Collapse to recent 90 days" : "Show full past year"}
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-[repeat(14,minmax(0,1fr))] xl:grid-cols-[repeat(28,minmax(0,1fr))]">
        {visibleActivity.map((item, index) => {
          const hasSavedWords = item.words > 0;
          const hasStudy = item.studyEvents > 0;
          const previousItem = visibleActivity[index - 1];
          const startsMonth =
            index === 0 || item.day.slice(0, 7) !== previousItem?.day.slice(0, 7);

          const monthLabel = new Date(`${item.day}T00:00:00`)
            .toLocaleString("en-US", { month: "short" })
            .toUpperCase();

          const monthTextClass =
            hasSavedWords || hasStudy ? "text-white drop-shadow-sm" : "text-slate-500";

          return (
            <div key={item.day} className="space-y-1">
              <div
                className={`relative h-10 rounded-lg border border-white/70 ${vocabularyRhythmColorClass(
                  item
                )}`}
                title={`${item.day}: ${item.words} saved word${
                  item.words === 1 ? "" : "s"
                }, ${item.studyEvents} study card${item.studyEvents === 1 ? "" : "s"}`}
              >
                {startsMonth ? (
                  <span
                    className={`absolute left-1 top-1 text-[8px] font-black tracking-wide ${monthTextClass}`}
                  >
                    {monthLabel}
                  </span>
                ) : null}
              </div>

              <div className="text-center text-[9px] text-slate-500">
                {item.day.slice(8)}
              </div>
            </div>
          );
        })}
      </div>

      <VocabularyRhythmLegend />

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SmallMetricCard
          label="Active vocab days"
          value={summary.activeVocabularyDays}
          hint="Saved or studied"
        />
        <SmallMetricCard
          label="Saved word days"
          value={summary.savedWordDays}
          hint="Words entered the system"
        />
        <SmallMetricCard
          label="Study days"
          value={summary.studyDays}
          hint="Book Study or Kanji practice"
        />
        <SmallMetricCard
          label="Words saved"
          value={summary.wordsSaved}
          hint={vocabularyRhythmWindowLabel}
        />
        <SmallMetricCard
          label="Cards reviewed"
          value={summary.studyEvents}
          hint={vocabularyRhythmWindowLabel}
        />
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white/70 p-4">
        <div className="text-sm font-semibold text-slate-900">Study rhythm</div>

        <div className="mt-2 text-sm leading-6 text-slate-600">
          {summary.wordsSaved === 0 && summary.studyEvents === 0
            ? "No vocabulary activity in this window yet. Save words while reading, then review a few cards to start building a rhythm."
            : summary.studyEvents === 0
              ? `You saved ${summary.wordsSaved} word${
                  summary.wordsSaved === 1 ? "" : "s"
                } in this window, but haven’t studied them yet.`
              : summary.wordsSaved === 0
                ? `You reviewed ${summary.studyEvents} card${
                    summary.studyEvents === 1 ? "" : "s"
                  } in this window, but did not save new words.`
                : `You saved ${summary.wordsSaved} word${
                    summary.wordsSaved === 1 ? "" : "s"
                  } and reviewed ${summary.studyEvents} card${
                    summary.studyEvents === 1 ? "" : "s"
                  } in this window. ${summary.overlapDays} day${
                    summary.overlapDays === 1 ? "" : "s"
                  } included both saving and studying.`}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <SmallMetricCard label="Unique words studied" value={studySignals.studiedWords} />
          <SmallMetricCard label="Books represented" value={studySignals.studiedBooks} />
          <SmallMetricCard
            label="Study accuracy"
            value={formatPercent(studySignals.accuracyPercent)}
            hint="Correct ÷ answered"
          />
        </div>

        {studySignals.answerMixItems.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            {studySignals.answerMixItems.map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-slate-900/10 bg-white/85 px-3 py-2 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${item.colorClass}`} />
                  <div className="text-[11px] text-slate-500">{item.label}</div>
                </div>

                <div className="mt-1 text-sm font-semibold text-slate-900">{item.value}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white/80 p-4">
        <div className="text-sm font-semibold text-slate-900">
          Books with sticky study words
        </div>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          Books rise here when their study cards have more missed answers. This is about
          vocabulary/kanji friction by source book, not color movement.
        </p>

        {studySignals.bookStudyItems.length === 0 ? (
          <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
            No book-linked study cards yet.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {studySignals.bookStudyItems.map((book) => {
              const answered = book.correct + book.incorrect;
              const stickyPercent =
                answered > 0 ? Math.round((book.incorrect / answered) * 100) : null;

              return (
                <div
                  key={book.userBookId}
                  className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-950">
                        {book.title}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {book.studyTypeLabel}
                        {book.studyTypeDetail ? ` · ${book.studyTypeDetail}` : ""}
                      </div>
                    </div>

                    <div className="text-right text-xs text-slate-500">
                      <div>
                        Accuracy:{" "}
                        <span className="font-semibold text-slate-900">
                          {formatPercent(book.accuracyPercent)}
                        </span>
                      </div>

                      <div>
                        Still sticky:{" "}
                        <span className="font-semibold text-slate-900">
                          {book.incorrect}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-4">
                    <SmallMetricCard label="Cards" value={book.total} />
                    <SmallMetricCard label="Correct" value={book.correct} />
                    <SmallMetricCard label="Sticky" value={book.incorrect} />
                    <SmallMetricCard
                      label="Sticky rate"
                      value={stickyPercent == null ? "—" : `${stickyPercent}%`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SectionBand>
  );
}