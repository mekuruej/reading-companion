type StudyBookHeaderProps = {
  bookTitle: string;
  bookCover: string;
};

export default function StudyBookHeader({
  bookTitle,
  bookCover,
}: StudyBookHeaderProps) {
  return (
    <div className="mb-3 flex w-full max-w-3xl flex-col items-center justify-center gap-3 md:flex-row md:items-center md:gap-2">
      <div className="flex shrink-0 flex-col items-center">
        {bookCover ? (
          <img
            src={bookCover}
            alt=""
            className="mb-2 h-32 w-24 rounded object-cover"
          />
        ) : null}

        <h1 className="text-center text-2xl font-semibold">
          {bookTitle}
        </h1>
      </div>

      <div className="w-full max-w-md">
        <p className="text-left text-sm leading-6 text-gray-500">
          Review the words from this book in a simple, random study session.
          Each word appears once per session.
        </p>
      </div>
    </div>
  );
}