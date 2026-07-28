import type { ReactNode } from "react";

type AddBookLookupCardProps = {
    isbn: string;
    asin: string;
    asinEditionFormat: string;
    lookupLoading: boolean;
    asinLookupLoading?: boolean;
    lookupDisabled?: boolean;
    asinLookupDisabled?: boolean;
    libraryLabel?: string;
    languageLabel?: string;
    onIsbnChange: (value: string) => void;
    onAsinChange: (value: string) => void;
    onAsinEditionFormatChange: (value: string) => void;
    onLookup: () => void;
    onAsinLookup: () => void;
    children?: ReactNode;
};

export default function AddBookLookupCard({
    isbn,
    asin,
    asinEditionFormat,
    lookupLoading,
    asinLookupLoading = false,
    lookupDisabled = false,
    asinLookupDisabled = false,
    libraryLabel = "your library",
    languageLabel,
    onIsbnChange,
    onAsinChange,
    onAsinEditionFormatChange,
    onLookup,
    onAsinLookup,
    children,
}: AddBookLookupCardProps) {
    return (
        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                Add Book
            </p>

            <h1 className="mt-2 text-2xl font-black text-stone-950">
                Add {languageLabel ? `a ${languageLabel} book` : "a book"} by ISBN or Amazon ASIN
            </h1>

            <p className="mt-3 text-sm leading-6 text-stone-600">
                Enter an ISBN-13 first when you have one. Mekuru can use it to look
                up the fullest book details, show you a preview, and add the book to{" "}
                {libraryLabel}.
            </p>

            <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
                ISBN-13 is the best first choice. Use Amazon ASIN for Kindle,
                Audible, or other Amazon-specific editions. Use title or author
                search below when identifier lookup does not work.
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

            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_220px_auto]">
                <input
                    value={asin}
                    onChange={(event) => onAsinChange(event.target.value)}
                    placeholder="Amazon ASIN, e.g. B0D4V5K3M8"
                    className="min-w-0 flex-1 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 shadow-sm outline-none transition focus:border-stone-400"
                />

                <select
                    value={asinEditionFormat}
                    onChange={(event) => onAsinEditionFormatChange(event.target.value)}
                    className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 shadow-sm outline-none transition focus:border-stone-400"
                >
                    <option value="">Edition format</option>
                    <option value="ebook">Kindle eBook</option>
                    <option value="audiobook">Audiobook</option>
                    <option value="paperback">Paperback</option>
                    <option value="hardcover">Hardcover</option>
                    <option value="other">Other</option>
                </select>

                <button
                    type="button"
                    onClick={onAsinLookup}
                    disabled={asinLookupLoading || asinLookupDisabled}
                    className="rounded-2xl border border-stone-300 bg-white px-5 py-3 text-sm font-black text-stone-800 shadow-sm transition hover:bg-stone-50 disabled:opacity-50"
                >
                    {asinLookupLoading ? "Looking..." : "Find ASIN"}
                </button>
            </div>

            {children}
        </section>
    );
}
