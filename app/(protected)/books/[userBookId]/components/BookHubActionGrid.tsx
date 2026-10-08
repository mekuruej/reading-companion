// Book Hub Action Grid
//

"use client";

import JapaneseLearningPromoCard from "@/components/japanese-learning/JapaneseLearningPromoCard";

type BookHubActionGridProps = {
  canUseJapaneseLearningActions?: boolean;
  canUseCuriosityReading?: boolean;
  canUseSavedWordReading: boolean;
  canUseStudyFlashcards: boolean;
  canUseVocabularyList: boolean;
  canUseBulkAdd?: boolean;
  canUseStoryNotes?: boolean;
  hasSavedWords: boolean;
  hasLearningJournalArchive?: boolean;
  showJapaneseLearningPromo?: boolean;

  onFluidReadingExtensive: () => void;
  onFluidReadingJustReading: () => void;
  onListening: () => void;
  onStudyFlashcards: () => void;
  onVocabularyList: () => void;
  onBulkAdd?: () => void;
  onStoryNotes?: () => void;
  onReadingSessions?: () => void;
  onBookStats?: () => void;
  onAboutBook?: () => void;
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
  eyebrow?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        {eyebrow ? (
          <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-500">
            {eyebrow}
          </p>
        ) : null}
        <h2 className={eyebrow ? "mt-1 text-xl font-black text-stone-950" : "text-xl font-black text-stone-950"}>
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-stone-600">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function CompactActionButton({
  title,
  description,
  className = "",
  onClick,
}: {
  title: string;
  description: string;
  className?: string;
  onClick: () => void | Promise<void>;
}) {
  const colorClass =
    className ||
    "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50";

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-xl border px-3.5 py-3 text-left shadow-sm transition-all hover:-translate-y-[1px] hover:shadow-md",
        colorClass,
      ].join(" ")}
    >
      <div className="text-base font-black text-stone-900">{title}</div>
      <div className="mt-1 text-xs leading-5 text-stone-600">{description}</div>
    </button>
  );
}

function UtilityActionButton({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void | Promise<void>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 items-center justify-center rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-black text-stone-800 shadow-sm transition hover:-translate-y-[1px] hover:border-stone-400 hover:bg-stone-50 hover:shadow-md"
      title={description}
    >
      {title}
    </button>
  );
}

export default function BookHubActionGrid({
  canUseJapaneseLearningActions = false,
  canUseCuriosityReading = false,
  canUseSavedWordReading,
  canUseStudyFlashcards,
  canUseVocabularyList,
  canUseBulkAdd = false,
  canUseStoryNotes = false,
  hasSavedWords,
  hasLearningJournalArchive = false,
  showJapaneseLearningPromo = false,
  onFluidReadingExtensive,
  onFluidReadingJustReading,
  onListening,
  onStudyFlashcards,
  onVocabularyList,
  onBulkAdd,
  onStoryNotes,
  onReadingSessions,
  onBookStats,
  onAboutBook,
}: BookHubActionGridProps) {
  const hasCurrentLearningAction =
    canUseSavedWordReading ||
    canUseStudyFlashcards ||
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
          title="Japanese Learning"
          description="ページをめくって、日本語を深めよう。"
        >
          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {canUseStudyFlashcards ? (
              <ActionButton
                title="Review Words"
                subtitle="Flashcards"
                description="Review the words you saved from this book."
                className="bg-blue-50 hover:bg-blue-100"
                onClick={onStudyFlashcards}
                size="primary"
              />
            ) : null}

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
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {canUseVocabularyList ? (
              <UtilityActionButton
                title="Vocabulary List"
                description="Open the saved words and vocabulary tools for this book."
                onClick={onVocabularyList}
              />
            ) : null}

            {canUseBulkAdd && onBulkAdd ? (
              <UtilityActionButton
                title="Bulk Add"
                description="Add several words to this book at once."
                onClick={onBulkAdd}
              />
            ) : null}
          </div>
        </ActionSection>
      ) : null}

      <ActionSection
        title="Reading Companion"
        description="Every word carries the memory of where you met it."
      >
        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <ActionButton
            title="Read"
            subtitle={canUseCuriosityReading ? "Fluid or Curiosity Reading" : "Fluid Reading"}
            description={canUseCuriosityReading
              ? "Choose a mode to read without stopping or save words as you read."
              : "Standard reading mode: time and log sessions without word capture."}
            className="bg-yellow-50 hover:bg-yellow-100"
            onClick={onFluidReadingJustReading}
            size="primary"
          />

          <ActionButton
            title="Listen"
            subtitle="Audiobook"
            description="Listen and track your audiobook progress."
            className="bg-sky-50 hover:bg-sky-100"
            onClick={onListening}
            size="primary"
          />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {onStoryNotes ? (
            <CompactActionButton
              title="Reading Journal"
              description="Track characters, plot, quotes, notes, and reviews."
              className="border-green-200 bg-green-50 text-green-950 hover:border-green-300 hover:bg-green-100"
              onClick={onStoryNotes}
            />
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {onBookStats ? (
            <UtilityActionButton
              title="Book Stats"
              description="Open time, pages, sessions, and progress for this book."
              onClick={onBookStats}
            />
          ) : null}
          {onReadingSessions ? (
            <UtilityActionButton
              title="Reading History"
              description="Edit session records, dates, and reading history for this book."
              onClick={onReadingSessions}
            />
          ) : null}
          {onAboutBook ? (
            <UtilityActionButton
              title="About this Book"
              description="View book details and metadata."
              onClick={onAboutBook}
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
