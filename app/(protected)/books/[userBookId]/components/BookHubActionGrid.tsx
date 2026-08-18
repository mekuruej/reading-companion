// Book Hub Action Grid
//

"use client";

import JapaneseLearningPromoCard from "@/components/japanese-learning/JapaneseLearningPromoCard";

type BookHubActionGridProps = {
  hasFullAccess: boolean;
  isTrialAccess?: boolean;
  canUseJapaneseLearningActions?: boolean;
  canUseCuriosityReading: boolean;
  canUseSavedWordReading: boolean;
  canUseStudyFlashcards: boolean;
  canUseVocabularyList: boolean;
  canUseBulkAdd?: boolean;
  canUseStoryNotes?: boolean;
  hasSavedWords: boolean;
  hasLearningJournalArchive?: boolean;
  showJapaneseLearningPromo?: boolean;

  onCuriosityReading: () => void;
  onFluidReadingExtensive: () => void;
  onFluidReadingJustReading: () => void;
  onListening: () => void;
  onStudyFlashcards: () => void;
  onVocabularyList: () => void;
  onBulkAdd?: () => void;
  onStoryNotes?: () => void;
  onReadingSessions?: () => void;
  onBookStats?: () => void;
};

function ActionButton({
  title,
  subtitle,
  description,
  className,
  onClick,
  size = "normal",
}: {
  title: string;
  subtitle?: string;
  description: string | string[];
  className: string;
  onClick: () => void | Promise<void>;
  size?: "normal" | "primary" | "secondary";
}) {
  const sizeClass =
    size === "primary"
      ? "min-h-[156px] px-5 py-5"
      : size === "secondary"
        ? "min-h-[96px] px-3 py-2.5"
        : "px-3.5 py-3";

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "relative rounded-xl border border-stone-900 text-center shadow-sm transition-all hover:-translate-y-[1px] hover:shadow-md",
        sizeClass,
        className,
      ].join(" ")}
    >
      <div
        className={
          size === "primary"
            ? "text-lg font-black text-stone-900 sm:text-xl"
            : "text-base font-semibold text-stone-900 sm:text-lg"
        }
      >
        {title}
      </div>

      {subtitle ? (
        <div
          className={[
            "font-semibold text-stone-900",
            subtitle.startsWith("(") || size === "secondary" ? "text-xs sm:text-sm" : "text-base sm:text-lg",
          ].join(" ")}
        >
          {subtitle}
        </div>
      ) : null}

      <div className="mt-2 text-xs leading-5 text-stone-700">
        {Array.isArray(description)
          ? description.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))
          : description}
      </div>
    </button>
  );
}

function ActionSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-500">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-black text-stone-950">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-stone-600">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export default function BookHubActionGrid({
  hasFullAccess,
  isTrialAccess = false,
  canUseJapaneseLearningActions = false,
  canUseCuriosityReading,
  canUseSavedWordReading,
  canUseStudyFlashcards,
  canUseVocabularyList,
  canUseBulkAdd = false,
  canUseStoryNotes = false,
  hasSavedWords,
  hasLearningJournalArchive = false,
  showJapaneseLearningPromo = false,
  onCuriosityReading,
  onFluidReadingExtensive,
  onFluidReadingJustReading,
  onStudyFlashcards,
  onVocabularyList,
  onBulkAdd,
  onStoryNotes,
  onReadingSessions,
  onBookStats,
}: BookHubActionGridProps) {
  const hasCurrentLearningAction =
    canUseSavedWordReading ||
    canUseStudyFlashcards ||
    canUseCuriosityReading ||
    canUseVocabularyList ||
    canUseBulkAdd;
  const showJapaneseLearningSection =
    canUseJapaneseLearningActions && hasCurrentLearningAction;
  const showJapaneseLearningArchive =
    !showJapaneseLearningSection && (hasSavedWords || hasLearningJournalArchive);

  return (
    <div className="space-y-6 pb-2">
      {showJapaneseLearningPromo ? (
        <JapaneseLearningPromoCard
          title="Study Japanese with this book"
          description="Add Japanese reading support, vocabulary tools, flashcards, and more."
          cta="See Japanese Learning tools →"
          source="book_hub"
          compact
        />
      ) : null}

      {showJapaneseLearningSection ? (
        <ActionSection
          eyebrow="Japanese Learning"
          title="Study tools for this Japanese book"
          description="Additional language-learning tools available with your current access."
        >
          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {canUseSavedWordReading ? (
              <ActionButton
                title="Follow-Along"
                subtitle="Supported Reading"
                description={[
                  "Fluid Reading: review with light support",
                  "from words you already saved.",
                ]}
                className="bg-violet-50 hover:bg-violet-100"
                onClick={onFluidReadingExtensive}
                size="primary"
              />
            ) : null}

            {canUseStudyFlashcards ? (
              <ActionButton
                title="Review Words"
                subtitle="Flashcards"
                description="Review the words you saved from this book."
                className="bg-violet-50 hover:bg-violet-100"
                onClick={onStudyFlashcards}
                size="primary"
              />
            ) : null}

            {canUseCuriosityReading ? (
              <ActionButton
                title="Save Words"
                subtitle="Look up Words and Read"
                description={["Curiosity Reading: save vocab", "while logging a slower session."]}
                className="bg-violet-50 hover:bg-violet-100"
                onClick={onCuriosityReading}
                size="primary"
              />
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 [&>button]:h-[104px]">
            {canUseVocabularyList ? (
              <ActionButton
                title="Vocabulary List"
                description={
                  hasFullAccess || isTrialAccess
                    ? "Open the saved words and vocabulary tools for this book."
                    : "Open saved words for this book."
                }
                className="bg-emerald-50 hover:bg-emerald-100"
                onClick={onVocabularyList}
                size="secondary"
              />
            ) : null}

            {canUseBulkAdd && onBulkAdd ? (
              <ActionButton
                title="Bulk Add"
                description="Add several words to this book at once."
                className="bg-yellow-50 hover:bg-yellow-100"
                onClick={onBulkAdd}
                size="secondary"
              />
            ) : null}
          </div>
        </ActionSection>
      ) : null}

      <ActionSection
        eyebrow="Reading Companion"
        title="Read, track, and remember this book"
        description="The universal reading workspace for this book."
      >
        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 [&>button]:h-[104px]">
          <ActionButton
            title="Read / Listen"
            description={[
              "Time reading or listening and update progress.",
              "You can open the Reading Journal beside it if you want to take notes.",
            ]}
            className="bg-emerald-50 hover:bg-emerald-100"
            onClick={onFluidReadingJustReading}
            size="secondary"
          />

          {onStoryNotes ? (
            <ActionButton
              title="Reading Journal"
              description="Track characters, plot, quotes, notes, and reviews."
              className="bg-sky-50 hover:bg-sky-100"
              onClick={onStoryNotes}
              size="secondary"
            />
          ) : null}

          {onBookStats ? (
            <ActionButton
              title="Book Stats"
              description="Open time, pages, sessions, and progress for this book."
              className="bg-yellow-50 hover:bg-yellow-100"
              onClick={onBookStats}
              size="secondary"
            />
          ) : null}

          {onReadingSessions ? (
            <ActionButton
              title="Reading History"
              description="Edit session records, dates, and reading history for this book."
              className="bg-purple-50 hover:bg-purple-100"
              onClick={onReadingSessions}
              size="secondary"
            />
          ) : null}
        </div>
      </ActionSection>

      {showJapaneseLearningArchive ? (
        <ActionSection
          eyebrow="Japanese Learning Archive"
          title="Saved learning material"
          description="Historical learning material stays available without unlocking active study tools."
        >
          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            {hasSavedWords ? (
              <ActionButton
                title="Vocabulary Archive"
                description="View saved words for this book in read-only archive mode."
                className="bg-violet-50 hover:bg-violet-100"
                onClick={onVocabularyList}
                size="secondary"
              />
            ) : null}

            {hasLearningJournalArchive && onStoryNotes ? (
              <ActionButton
                title="Journal Archive"
                description="Review archived Detective, Setting, or Cultural notes."
                className="bg-amber-50 hover:bg-amber-100"
                onClick={onStoryNotes}
                size="secondary"
              />
            ) : null}
          </div>
        </ActionSection>
      ) : null}
    </div>
  );
}
