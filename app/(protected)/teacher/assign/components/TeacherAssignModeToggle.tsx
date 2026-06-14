type TeacherAssignActionMode = "add_to_library" | "prep_future";

type TeacherAssignModeToggleProps = {
  actionMode: TeacherAssignActionMode;
  onChangeMode: (mode: TeacherAssignActionMode) => void;
};

export function TeacherAssignModeToggle({
  actionMode,
  onChangeMode,
}: TeacherAssignModeToggleProps) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button
        type="button"
        onClick={() => onChangeMode("add_to_library")}
        style={{
          padding: "10px 14px",
          borderRadius: 14,
          border:
            actionMode === "add_to_library"
              ? "1px solid rgba(20,83,45,0.75)"
              : "1px solid rgba(0,0,0,0.16)",
          background:
            actionMode === "add_to_library"
              ? "rgba(220,252,231,0.9)"
              : "rgba(255,255,255,0.85)",
          fontWeight: 850,
          cursor: "pointer",
        }}
      >
        Add to Learner Library
      </button>

      <button
        type="button"
        onClick={() => onChangeMode("prep_future")}
        style={{
          padding: "10px 14px",
          borderRadius: 14,
          border:
            actionMode === "prep_future"
              ? "1px solid rgba(146,64,14,0.75)"
              : "1px solid rgba(0,0,0,0.16)",
          background:
            actionMode === "prep_future"
              ? "rgba(254,243,199,0.9)"
              : "rgba(255,255,255,0.85)",
          fontWeight: 850,
          cursor: "pointer",
        }}
      >
        Prep for Future Learner
      </button>
    </div>
  );
}