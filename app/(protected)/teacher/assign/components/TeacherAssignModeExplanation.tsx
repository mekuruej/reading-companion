type TeacherAssignActionMode = "add_to_library" | "prep_future";

type TeacherAssignModeExplanationProps = {
  actionMode: TeacherAssignActionMode;
};

export function TeacherAssignModeExplanation({
  actionMode,
}: TeacherAssignModeExplanationProps) {
  return (
    <div
      style={{
        borderRadius: 14,
        border: "1px solid rgba(0,0,0,0.1)",
        padding: 12,
        background:
          actionMode === "add_to_library"
            ? "rgba(240,253,244,0.8)"
            : "rgba(255,251,235,0.85)",
        color: "#44403c",
        fontSize: 14,
        lineHeight: 1.6,
      }}
    >
      {actionMode === "add_to_library"
        ? "This creates a learner-visible currently reading book. No page or current location is required."
        : "This saves the book to your prep shelf only. No learner library row is created yet."}
    </div>
  );
}