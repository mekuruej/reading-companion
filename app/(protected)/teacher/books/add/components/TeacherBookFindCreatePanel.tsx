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
                Edit an existing book or create a new entry
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
                To edit an existing book, enter its ISBN and choose Look up ISBN, then
                Edit existing catalog book. You can also enter a title and ISBN or ASIN
                below to open a matching book for editing, or create an entry if none matches.
                For a new book without either identifier, enter its title and choose Create Manual Book Entry.
            </p>

            {children}
        </section>
    );
}
