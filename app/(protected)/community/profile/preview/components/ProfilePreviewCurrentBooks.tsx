type CurrentBookPreviewItem = {
  id: string;
  title: string;
  author: string | null;
  cover_url: string | null;
};

type ProfilePreviewCurrentBooksProps = {
  books: CurrentBookPreviewItem[];
};

export default function ProfilePreviewCurrentBooks({
  books,
}: ProfilePreviewCurrentBooksProps) {
  if (books.length === 0) return null;

  return (
    <div className="mt-4 rounded-2xl border border-stone-100 bg-white p-4">
      <div className="text-xs font-black uppercase tracking-[0.16em] text-stone-400">
        Currently reading
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {books.map((book) => (
          <div
            key={book.id}
            className="flex gap-3 rounded-2xl border border-stone-100 bg-stone-50 p-3"
          >
            <div className="h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-stone-200">
              {book.cover_url ? (
                <img
                  src={book.cover_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>

            <div className="min-w-0">
              <div className="line-clamp-2 text-sm font-black leading-5 text-stone-900">
                {book.title}
              </div>

              {book.author ? (
                <div className="mt-1 line-clamp-2 text-xs leading-5 text-stone-500">
                  {book.author}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}