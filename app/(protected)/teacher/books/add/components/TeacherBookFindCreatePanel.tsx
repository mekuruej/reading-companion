import type { ReactNode } from "react";

type TeacherBookFindCreatePanelProps = {
    children: ReactNode;
};

export function TeacherBookFindCreatePanel({
    children,
}: TeacherBookFindCreatePanelProps) {
    return (
        <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-stone-900">
                Find or create global book
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
                Use ISBN lookup when possible. If the lookup fails, you can still create
                a manual global book and fill in the details below.
            </p>

            {children}
        </section>
    );
}