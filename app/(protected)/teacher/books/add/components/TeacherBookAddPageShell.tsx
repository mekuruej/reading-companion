import type { ReactNode } from "react";

type TeacherBookAddPageShellProps = {
    children: ReactNode;
};

export function TeacherBookAddPageShell({
    children,
}: TeacherBookAddPageShellProps) {
    return <main className="mx-auto max-w-4xl p-6">{children}</main>;
}