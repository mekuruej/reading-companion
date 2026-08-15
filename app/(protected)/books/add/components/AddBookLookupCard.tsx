import type { ReactNode } from "react";

type AddBookLookupCardProps = {
    isbn: string;
    asin: string;
    asinEditionFormat: string;
    identifierRequestTitle: string;
    lookupLoading: boolean;
    asinLookupLoading?: boolean;
    lookupDisabled?: boolean;
    asinLookupDisabled?: boolean;
    onIsbnChange: (value: string) => void;
    onAsinChange: (value: string) => void;
    onAsinEditionFormatChange: (value: string) => void;
    onIdentifierRequestTitleChange: (value: string) => void;
    onLookup: () => void;
    onAsinLookup: () => void;
    children?: ReactNode;
};

export default function AddBookLookupCard({
    isbn,
    asin,
    asinEditionFormat,
    identifierRequestTitle,
    lookupLoading,
    asinLookupLoading = false,
    lookupDisabled = false,
    asinLookupDisabled = false,
    onIsbnChange,
    onAsinChange,
    onAsinEditionFormatChange,
    onIdentifierRequestTitleChange,
    onLookup,
    onAsinLookup,
    children,
}: AddBookLookupCardProps) {
    return (
        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                Identifier lookup
            </p>

            <h2 className="mt-2 text-xl font-black text-stone-950">
                Find by ISBN or Amazon ASIN
            </h2>

            <p className="mt-2 text-sm leading-6 text-stone-600">
                Enter an ISBN-13 first when you have one. Use Amazon ASIN for
                Kindle, Audible, or other Amazon-specific editions.
            </p>

            <div className="mt-4 rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-700">
                If lookup does not find the exact edition, add the title here and
                fill in the edition details manually. The title below is only for ISBN/ASIN fallback;
                the fallback title search has its own box.
            </div>

            <div className="mt-4 rounded-2xl border border-stone-100 bg-stone-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-stone-500">
                    ISBN edition
                </p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                    <input
                        value={isbn}
                        onChange={(event) => onIsbnChange(event.target.value)}
                        placeholder="ISBN-13, e.g. 978..."
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
            </div>

            <div className="mt-3 rounded-2xl border border-stone-100 bg-stone-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-stone-500">
                    Amazon edition
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_220px_auto]">
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
            </div>

            <label className="mt-4 block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-stone-500">
                    Title for ISBN/ASIN fallback
                </span>
                <input
                    value={identifierRequestTitle}
                    onChange={(event) => onIdentifierRequestTitleChange(event.target.value)}
                    placeholder="Optional title to prefill if lookup misses"
                    className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 shadow-sm outline-none transition focus:border-stone-400"
                />
            </label>

            {children}
        </section>
    );
}
