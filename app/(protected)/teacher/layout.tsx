// Teacher Protected Layout
//

import TeacherAccessGate from "@/components/TeacherAccessGate";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TeacherAccessGate>{children}</TeacherAccessGate>;
}