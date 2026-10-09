// Book Hub Action Grid
//

"use client";

import JapaneseLearningPromoCard from "@/components/japanese-learning/JapaneseLearningPromoCard";
import Link from "next/link";

type BookHubActionGridProps = {
  japaneseLearningCta: { label: string; href: string };
  onJapaneseLearningCtaClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  canUseJapaneseLearningActions?: boolean;
  canUseCuriosityReading?: boolean;
  canUseSavedWordReading: boolean;
  canUseStudyFlashcards: boolean;
  canUseVocabularyList: boolean;
  canUseBulkAdd?: boolean;
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

const coolCardStyles = {
  sky: "border-sky-200 bg-gradient-to-br from-sky-100 via-cyan-50 to-teal-50 hover:border-sky-400",
  mint: "border-teal-200 bg-gradient-to-br from-blue-50 via-teal-50 to-emerald-100 hover:border-teal-400",
};

function ActionButton({
  title,
  subtitle,
  description,
  className = "",
  appearance,
  onClick,
  size = "normal",
}: {
  title: string;
  subtitle?: string;
  description: string | string[];
  className?: string;
  appearance?: keyof typeof coolCardStyles;
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
        "relative rounded-xl border text-center transition-all hover:-translate-y-[1px] hover:shadow-md",
        appearance ? coolCardStyles[appearance] : "border-stone-900",
        appearance ? "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2" : "",
        size === "primary"
          ? "shadow-[0_3px_14px_rgba(41,37,36,0.12)]"
          : "shadow-sm",
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
          <p data-hub-surface-text="body" className="text-xs font-black uppercase tracking-[0.18em] text-stone-500">
            {eyebrow}
          </p>
        ) : null}
        <h2 data-hub-surface-text="heading" className={eyebrow ? "mt-1 text-xl font-black text-stone-950" : "text-xl font-black text-stone-950"}>
          {title}
        </h2>
        {description ? (
          <p data-hub-surface-text="body" className="mt-1 text-sm leading-6 text-stone-600">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
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
      className="inline-flex min-h-11 items-center justify-center rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-black text-stone-800 shadow-[0_2px_8px_rgba(41,37,36,0.10)] transition hover:-translate-y-[1px] hover:border-stone-400 hover:bg-stone-50 hover:shadow-md"
      title={description}
    >
      {title}
    </button>
  );
}

export default function BookHubActionGrid({
  japaneseLearningCta,
  onJapaneseLearningCtaClick,
  canUseJapaneseLearningActions = false,
  canUseCuriosityReading = false,
  canUseSavedWordReading,
  canUseStudyFlashcards,
  canUseVocabularyList,
  canUseBulkAdd = false,
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
  const showJapaneseLearningContent =
    showJapaneseLearningSection || showJapaneseLearningPromo;
  const showJapaneseLearningArchive =
    !showJapaneseLearningSection && (hasSavedWords || hasLearningJournalArchive);

  return (
    <div className="space-y-6 pb-2">
      <ActionSection
        title="Reading Companion"
        description="Every word carries the memory of where you met it."
      >
        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <ActionButton
            title="Read"
            subtitle={canUseCuriosityReading ? "Save Japanese words as you go!" : "Read and track your progress."}
            description={canUseCuriosityReading
              ? "Just read or read and save words as you go."
              : "Read at your pace and keep your progress up to date."}
            appearance="sky"
            onClick={onFluidReadingJustReading}
            size="primary"
          />

          <ActionButton
            title="Listen"
            subtitle="Audiobook"
            description="Listen and track your audiobook progress."
            appearance="mint"
            onClick={onListening}
            size="primary"
          />

        </div>

        <div className="flex flex-wrap gap-2">
          {onStoryNotes ? (
            <UtilityActionButton
              title="Reading Journal"
              description="Open your private Reading Journal for this book."
              onClick={onStoryNotes}
            />
          ) : null}
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

      {showJapaneseLearningContent ? (
        <ActionSection
          title="Japanese Learning"
          description="Study and review language from this book."
        >
          {showJapaneseLearningSection ? (
            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                {canUseStudyFlashcards ? (
                  <ActionButton
                    title="Flashcards"
                    description="Review the words you saved from this book."
                    appearance="sky"
                    onClick={onStudyFlashcards}
                    size="primary"
                  />
                ) : null}
                {canUseSavedWordReading ? (
                  <ActionButton
                    title="Follow-Along"
                    description="Read this book with light support from words you saved."
                    appearance="mint"
                    onClick={onFluidReadingExtensive}
                    size="primary"
                  />
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
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
                <Link
                  href={japaneseLearningCta.href}
                  onClick={onJapaneseLearningCtaClick}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-black text-stone-800 shadow-[0_2px_8px_rgba(41,37,36,0.10)] transition hover:-translate-y-[1px] hover:border-stone-400 hover:bg-stone-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2"
                >
                  Study Hub
                </Link>
              </div>
            </div>
          ) : null}
          {showJapaneseLearningPromo ? (
            <JapaneseLearningPromoCard
              title="Study Japanese with this book"
              description="Add Japanese reading support, vocabulary tools, flashcards, and more."
              cta={japaneseLearningCta.label}
              source="book_hub"
              href={japaneseLearningCta.href}
              onCtaClick={onJapaneseLearningCtaClick}
              compact
            />
          ) : null}
        </ActionSection>
      ) : null}

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
