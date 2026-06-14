import type { ReactNode } from "react";

type TeacherAssignFormCardProps = {
  children: ReactNode;
};

export function TeacherAssignFormCard({ children }: TeacherAssignFormCardProps) {
  return (
    <div
      style={{
        marginTop: 18,
        padding: 16,
        borderRadius: 14,
        border: "1px solid rgba(0,0,0,0.12)",
        background: "rgba(255,255,255,0.7)",
        display: "grid",
        gap: 14,
      }}
    >
      {children}
    </div>
  );
}