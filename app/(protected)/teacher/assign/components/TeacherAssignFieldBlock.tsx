import type { ReactNode } from "react";

type TeacherAssignFieldBlockProps = {
  label: ReactNode;
  children: ReactNode;
};

export function TeacherAssignFieldBlock({
  label,
  children,
}: TeacherAssignFieldBlockProps) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div style={{ fontWeight: 800 }}>{label}</div>
      {children}
    </label>
  );
}