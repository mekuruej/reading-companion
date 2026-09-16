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
                Enter all or part of a title and choose Find by title to edit, then select
                the matching edition. No ISBN is needed to find an existing book.
                You can also look up an ISBN, or create a new catalog entry below.
            </p>

            {children}
        </section>
    );
}
