type PendingBookCoverProps = {
  className?: string;
};

export default function PendingBookCover({
  className = "",
}: PendingBookCoverProps) {
  return (
    <div
      role="img"
      aria-label="Your book is ready. Let the reading begin! Book details being updated"
      className={`relative flex aspect-[2/3] w-full flex-col items-center justify-between overflow-hidden rounded-md border border-amber-300 bg-gradient-to-br from-rose-100 via-amber-50 to-sky-100 p-2 pb-3 text-center text-stone-800 shadow-md ${className}`}
    >
      <span
        aria-hidden="true"
        className="absolute -right-5 -top-5 h-16 w-16 rounded-full bg-amber-300/50"
      />
      <span
        aria-hidden="true"
        className="absolute -bottom-5 -left-5 h-20 w-20 rounded-full bg-sky-300/50"
      />
      <span className="relative rounded-full border border-white/80 bg-white/70 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.18em] text-rose-700 sm:text-[9px]">
        MEKURU
      </span>
      <div className="relative flex flex-1 flex-col items-center justify-center">
        <svg
          aria-hidden="true"
          viewBox="0 0 48 36"
          className="mb-2 h-8 w-10 text-amber-700 sm:h-10 sm:w-12"
          fill="none"
        >
          <path
            d="M24 9C19 5 12 4 5 6v23c7-2 14-1 19 3V9Zm0 0c5-4 12-5 19-3v23c-7-2-14-1-19 3V9Z"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d="M10 12c4-1 8 0 11 2m17-2c-4-1-8 0-11 2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <p className="text-[11px] font-black leading-tight sm:text-sm">
          Your book is ready. Let the reading begin!
        </p>
      </div>
      <p className="relative text-[8px] font-medium italic text-stone-600 sm:text-[10px]">
        Book details being updated
      </p>
    </div>
  );
}
