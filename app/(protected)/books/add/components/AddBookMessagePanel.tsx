type AddBookMessagePanelProps = {
  message: string;
  canRequestBook: boolean;
  requestLoading: boolean;
  onRequestBook: () => void;
};

export default function AddBookMessagePanel({
  message,
  canRequestBook,
  requestLoading,
  onRequestBook,
}: AddBookMessagePanelProps) {
  if (!message) return null;

  return (
    <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
      <p>{message}</p>

      {canRequestBook ? (
        <button
          type="button"
          onClick={onRequestBook}
          disabled={requestLoading}
          className="mt-3 rounded-xl bg-red-700 px-4 py-2 text-xs font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {requestLoading ? "Sending..." : "Request this book for review"}
        </button>
      ) : null}
    </div>
  );
}