type TeacherAssignActionMode = "add_to_library" | "prep_future";

type TeacherAssignPrimaryActionButtonProps = {
  actionMode: TeacherAssignActionMode;
  onPrimaryAction: () => void;
};

export function TeacherAssignPrimaryActionButton({
  actionMode,
  onPrimaryAction,
}: TeacherAssignPrimaryActionButtonProps) {
  return (
    <button
      onClick={onPrimaryAction}
      style={{
        padding: "10px 14px",
        borderRadius: 12,
        border: "1px solid rgba(0,0,0,0.22)",
        background: "rgba(0,0,0,0.06)",
        fontWeight: 850,
        cursor: "pointer",
      }}
    >
      {actionMode === "add_to_library"
        ? "Add to Learner Library"
        : "Add to Prep Shelf"}
    </button>
  );
}