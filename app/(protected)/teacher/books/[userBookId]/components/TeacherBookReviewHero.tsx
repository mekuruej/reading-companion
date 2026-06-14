type TeacherBookReviewHeroBook = {
    title: string | null;
    title_reading: string | null;
    cover_url: string | null;
};

type TeacherBookReviewHeroProps = {
    book: TeacherBookReviewHeroBook | null;
};

export function TeacherBookReviewHero({ book }: TeacherBookReviewHeroProps) {
    return (
        <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
            <div className="grid gap-6 p-6 md:grid-cols-[120px_minmax(0,1fr)] md:p-8">
                <div>
                    {book?.cover_url ? (
                        <img
                            src={book.cover_url}
                            alt={`${book.title ?? "Book"} cover`}
                            className="w-28 rounded-2xl border border-stone-200 object-cover shadow-sm"
                        />
                    ) : (
                        <div className="flex aspect-[2/3] w-28 items-center justify-center rounded-2xl border border-stone-200 bg-stone-100 text-xs text-stone-400">
                            No cover
                        </div>
                    )}
                </div>

                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                        Teacher Book Review
                    </p>
                    <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-900">
                        {book?.title ?? "Untitled book"}
                    </h1>
                    {book?.title_reading ? (
                        <p className="mt-1 text-lg text-stone-500">
                            {book.title_reading}
                        </p>
                    ) : null}

                    <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600">
                        Teacher-facing notes and ratings for deciding how useful this book is for guided reading,
                        lessons, trials, or book clubs.
                    </p>
                </div>
            </div>
        </section>
    );
}