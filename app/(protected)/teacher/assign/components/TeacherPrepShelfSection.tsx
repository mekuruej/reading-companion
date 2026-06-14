import type { ReactNode } from "react";

import { TeacherPrepShelfHeader } from "./TeacherPrepShelfHeader";

type TeacherPrepShelfSectionProps = {
  children: ReactNode;
};

export function TeacherPrepShelfSection({
  children,
}: TeacherPrepShelfSectionProps) {
  return (
    <section style={{ marginTop: 26 }}>
      <TeacherPrepShelfHeader />
      {children}
    </section>
  );
}