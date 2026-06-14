import type { ReactNode } from "react";

type TeacherAssignPageShellProps = {
  children: ReactNode;
};

export function TeacherAssignPageShell({ children }: TeacherAssignPageShellProps) {
  return <main style={{ padding: 24 }}>{children}</main>;
}