import type { ReactNode } from "react";
import TeacherStudentGroupSection from "./TeacherStudentGroupSection";

const STUDENT_GROUPS = [
  {
    key: "current",
    label: "Current",
    detail: "Learners you are actively working with now.",
  },
  {
    key: "future",
    label: "Future",
    detail: "Trial, prep, and upcoming learners.",
  },
  {
    key: "past",
    label: "Past",
    detail: "Former active relationships. Restore when needed.",
  },
] as const;

type StudentGroupKey = (typeof STUDENT_GROUPS)[number]["key"];

type TeacherStudentGroupsPanelProps<T> = {
  groupedStudents: Record<StudentGroupKey, readonly T[]>;
  openGroups: Record<StudentGroupKey, boolean>;
  hiddenGroups?: readonly StudentGroupKey[];
  nounLabel?: string;
  groupNounLabel?: string;
  onToggleGroup: (group: StudentGroupKey) => void;
  renderStudent: (student: T) => ReactNode;
};

export default function TeacherStudentGroupsPanel<T>({
  groupedStudents,
  openGroups,
  hiddenGroups = [],
  nounLabel = "student",
  groupNounLabel = "Students",
  onToggleGroup,
  renderStudent,
}: TeacherStudentGroupsPanelProps<T>) {
  return (
    <>
      {STUDENT_GROUPS.filter((group) => !hiddenGroups.includes(group.key)).map((group) => (
        <TeacherStudentGroupSection
          key={group.key}
          title={`${group.label} ${groupNounLabel}`}
          detail={group.detail}
          items={groupedStudents[group.key]}
          isOpen={openGroups[group.key]}
          nounLabel={nounLabel}
          onToggle={() => onToggleGroup(group.key)}
          renderStudent={renderStudent}
        />
      ))}
    </>
  );
}
