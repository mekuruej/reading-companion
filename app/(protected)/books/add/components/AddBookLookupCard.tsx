import type { ReactNode } from "react";

type AddBookLookupCardProps = {
    isbn: string;
    lookupLoading: boolean;
    lookupDisabled?: boolean;
    onIsbnChange: (value: string) => void;
    onLookup: () => void;
    children?: ReactNode;
};

export default function AddBookLookupCard({
    isbn,
    lookupLoading,
    lookupDisabled = false,
    onIsbnChange,
    onLookup,
    children,
}: AddBookLookupCardProps) {
    return (
        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                Add Book
            </p>

            <h1 className="mt-2 text-2xl font-black text-stone-950">
                Add a Japanese book by ISBN-13
            </h1>

            <p className="mt-3 text-sm leading-6 text-stone-600">
                Enter an ISBN-13 first when you have one. Mekuru can use it to look
                up the fullest book details, show you a preview, and add the book to
                your library.
            </p>

            <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
                ISBN-13 is the best first choice. Use title or author search below
                only when the ISBN lookup does not work, or when the book does not
                have an ISBN.
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <input
                    value={isbn}
                    onChange={(event) => onIsbnChange(event.target.value)}
                    placeholder="978..."
                    inputMode="numeric"
                    className="min-w-0 flex-1 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 shadow-sm outline-none transition focus:border-stone-400"
                />

                <button
                    type="button"
                    onClick={onLookup}
                    disabled={lookupLoading || lookupDisabled}
                    className="rounded-2xl bg-stone-900 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-stone-800 disabled:opacity-50"
                >
                    {lookupLoading ? "Looking..." : "Look Up ISBN"}
                </button>
            </div>

            {children}
        </section>
    );
}
