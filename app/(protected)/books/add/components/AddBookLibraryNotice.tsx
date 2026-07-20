type AddBookLibraryNoticeProps = {
  message: string;
  detail?: string | null;
  userBookId?: string | null;
  onOpenBook: (userBookId: string) => void;
  returnLabel?: string | null;
  onReturn?: () => void;
};

export default function AddBookLibraryNotice({
  message,
  detail,
  userBookId,
  onOpenBook,
  returnLabel,
  onReturn,
}: AddBookLibraryNoticeProps) {
  return (
    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
      <p className="font-bold">{message}</p>

      {detail ? <p className="mt-1">{detail}</p> : null}

      {userBookId ? (
        <button
          type="button"
          onClick={() => onOpenBook(userBookId)}
          className="mt-3 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-black text-white transition hover:bg-emerald-800"
        >
          Open this book
        </button>
      ) : null}

      {returnLabel && onReturn ? (
        <button
          type="button"
          onClick={onReturn}
          className="mt-3 rounded-xl border border-emerald-300 bg-white px-4 py-2 text-xs font-black text-emerald-800 transition hover:bg-emerald-100"
        >
          {returnLabel}
        </button>
      ) : null}
    </div>
  );
}
