type TeacherKanjiEmptyStateProps = {
  mode?: "flagged" | "ongoing" | "all";
};

export default function TeacherKanjiEmptyState({
  mode = "all",
}: TeacherKanjiEmptyStateProps) {
  const copy =
    mode === "flagged"
      ? {
          title: "No flagged kanji readings right now.",
          description: "New items will appear here when readers flag kanji readings for review.",
        }
      : mode === "ongoing"
        ? {
            title: "No ongoing kanji upkeep items right now.",
            description: "New upkeep items will appear here as readers save words that need kanji-reading enrichment.",
          }
        : {
            title: "Queue is clear.",
            description: "New kanji items will appear here as readers save words or flag kanji for review.",
          };

  return (
    <div className="p-8 text-center">
      <p className="text-lg font-black text-stone-900">{copy.title}</p>
      <p className="mt-2 text-sm text-stone-500">
        {copy.description}
      </p>
    </div>
  );
}
