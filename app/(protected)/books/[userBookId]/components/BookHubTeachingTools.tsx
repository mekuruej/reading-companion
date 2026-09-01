type BookHubTeachingToolsProps = {
  canUseVocabularyList: boolean;
  canUseBulkAdd: boolean;
  canUseStoryNotes: boolean;
  onVocabularyList: () => void;
  onBulkAdd: () => void;
  onFollowAlongLesson: () => void;
  onStoryNotes: () => void;
  onAboutBook: () => void;
  onTeacherSnapshot: () => void;
  onFlagBook: () => void;
};

function TeachingToolButton({
  title,
  description,
  tone,
  onClick,
}: {
  title: string;
  description: string;
  tone: "blue" | "green" | "amber" | "rose";
  onClick: () => void;
}) {
  const toneClass = {
    blue: "border-blue-200 bg-blue-50 text-blue-950 hover:border-blue-300 hover:bg-blue-100",
    green: "border-green-200 bg-green-50 text-green-950 hover:border-green-300 hover:bg-green-100",
    amber: "border-amber-200 bg-amber-50 text-amber-950 hover:border-amber-300 hover:bg-amber-100",
    rose: "border-rose-200 bg-rose-50 text-rose-950 hover:border-rose-300 hover:bg-rose-100",
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-xl border px-4 py-4 text-left shadow-sm transition-all hover:-translate-y-[1px] hover:shadow-md",
        toneClass,
      ].join(" ")}
    >
      <div className="text-base font-black">{title}</div>
      <div className="mt-1 text-sm font-semibold leading-5 opacity-80">{description}</div>
    </button>
  );
}

export default function BookHubTeachingTools({
  canUseVocabularyList,
  canUseBulkAdd,
  canUseStoryNotes,
  onVocabularyList,
  onBulkAdd,
  onFollowAlongLesson,
  onStoryNotes,
  onAboutBook,
  onTeacherSnapshot,
  onFlagBook,
}: BookHubTeachingToolsProps) {
  return (
    <div className="space-y-4 pb-2">
      <section className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-stone-500">
          Shared Book Tools
        </p>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {canUseVocabularyList ? (
            <TeachingToolButton
              title="Saved Vocabulary"
              description="Use the same saved words for reading and teaching prep."
              tone="blue"
              onClick={onVocabularyList}
            />
          ) : null}
          {canUseBulkAdd ? (
            <TeachingToolButton
              title="Bulk Add"
              description="Add several lesson words to your teaching vocabulary or one student."
              tone="green"
              onClick={onBulkAdd}
            />
          ) : null}
          <TeachingToolButton
            title="Follow-Along + Add Words"
            description="Teach from your prepared list while saving new words for one student."
            tone="blue"
            onClick={onFollowAlongLesson}
          />
          {canUseStoryNotes ? (
            <TeachingToolButton
              title="Book Journal"
              description="Use shared characters, plot, quotes, and book notes."
              tone="green"
              onClick={onStoryNotes}
            />
          ) : null}
          <TeachingToolButton
            title="About This Book"
            description="Review the book record, edition, and community signals."
            tone="amber"
            onClick={onAboutBook}
          />
          <TeachingToolButton
            title="Teacher Snapshot"
            description="Review teaching fit and reader signals for this book."
            tone="blue"
            onClick={onTeacherSnapshot}
          />
          <TeachingToolButton
            title="Flag This Book"
            description="Send a catalog or metadata issue to the review queue."
            tone="rose"
            onClick={onFlagBook}
          />
        </div>
      </section>
    </div>
  );
}
