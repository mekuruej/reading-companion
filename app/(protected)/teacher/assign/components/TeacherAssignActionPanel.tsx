import { TeacherAssignLearningTasksNote } from "./TeacherAssignLearningTasksNote";
import { TeacherAssignModeExplanation } from "./TeacherAssignModeExplanation";
import { TeacherAssignPrimaryActionButton } from "./TeacherAssignPrimaryActionButton";

type TeacherAssignActionMode = "add_to_library" | "prep_future";

type TeacherAssignActionPanelProps = {
  actionMode: TeacherAssignActionMode;
  onPrimaryAction: () => void;
};

export function TeacherAssignActionPanel({
  actionMode,
  onPrimaryAction,
}: TeacherAssignActionPanelProps) {
  return (
    <>
      <TeacherAssignModeExplanation actionMode={actionMode} />

      <TeacherAssignPrimaryActionButton
        actionMode={actionMode}
        onPrimaryAction={onPrimaryAction}
      />

      <TeacherAssignLearningTasksNote />
    </>
  );
}