import type { ReactNode } from "react";
import TeacherStudentGroupSection from "./TeacherStudentGroupSection";

const STUDENT_GROUPS = [
  {
    key: "future",
    title: "Future Students",
    detail: "Trial, prep, and upcoming learners.",
  },
  {
    key: "current",
    title: "Current Students",
    detail: "Learners you are actively working with now.",
  },
  {
    key: "past",
    title: "Past Students",
    detail: "Expired or former active relationships.",
  },
  {
    key: "archived",
    title: "Archived Students",
    detail: "Hidden from active teacher lists and alerts. Restore when needed.",
  },
] as const;

type StudentGroupKey = (typeof STUDENT_GROUPS)[number]["key"];

type TeacherStudentGroupsPanelProps<T> = {
  groupedStudents: Record<StudentGroupKey, readonly T[]>;
  renderStudent: (student: T) => ReactNode;
};

export default function TeacherStudentGroupsPanel<T>({
  groupedStudents,
  renderStudent,
}: TeacherStudentGroupsPanelProps<T>) {
  return (
    <>
      {STUDENT_GROUPS.map((group) => (
        <TeacherStudentGroupSection
          key={group.key}
          title={group.title}
          detail={group.detail}
          items={groupedStudents[group.key]}
          renderStudent={renderStudent}
        />
      ))}
    </>
  );
}