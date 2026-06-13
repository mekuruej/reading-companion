import type { ReactNode } from "react";

import { TeacherBookInfoSectionHeader } from "./TeacherBookInfoSectionHeader";

type TeacherBookInfoSectionProps = {
    missingFields: string[];
    children: ReactNode;
};

export function TeacherBookInfoSection({
    missingFields,
    children,
}: TeacherBookInfoSectionProps) {
    return (
        <section className="mt-8 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <TeacherBookInfoSectionHeader missingFields={missingFields} />

            {children}
        </section>
    );
}