type PendingBookRequest = {
  id: string;
  title: string | null;
  author: string | null;
  isbn13: string | null;
  created_at: string | null;
  profiles: {
    display_name: string | null;
    username: string | null;
  } | null;
};

type PendingBookRequestsAlertProps = {
  requests: PendingBookRequest[];
  onDismiss: () => void;
  onApprove: (requestId: string) => void | Promise<void>;
  onReject: (requestId: string) => void | Promise<void>;
};

export default function PendingBookRequestsAlert({
  requests,
  onDismiss,
  onApprove,
  onReject,
}: PendingBookRequestsAlertProps) {
  return (
    <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-amber-900">
            Pending Book Requests
          </h2>
          <p className="mt-1 text-xs text-amber-800">
            {requests.length} pending{" "}
            {requests.length === 1 ? "request" : "requests"}
          </p>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
        >
          Dismiss
        </button>
      </div>

      <div className="mt-3 space-y-3">
        {requests.map((request) => (
          <div
            key={request.id}
            className="rounded-xl border border-amber-200 bg-white px-3 py-3"
          >
            <div className="text-sm font-medium text-stone-900">
              {request.title || "Untitled"}
            </div>

            <div className="mt-1 text-xs text-stone-600">
              {request.author ? `Author: ${request.author}` : "Author: —"}
            </div>

            <div className="mt-1 text-xs text-stone-600">
              {request.isbn13 ? `ISBN: ${request.isbn13}` : "ISBN: —"}
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => void onApprove(request.id)}
                className="rounded-lg bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700"
              >
                Add to Library
              </button>

              <button
                type="button"
                onClick={() => void onReject(request.id)}
                className="rounded-lg border border-rose-200 bg-white px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
              >
                Reject
              </button>
            </div>

            <div className="mt-2 text-xs text-stone-500">
              Requested by{" "}
              <span className="font-medium text-stone-700">
                {request.profiles?.display_name ||
                  request.profiles?.username ||
                  "User"}
              </span>
            </div>

            <div className="mt-1 text-[11px] text-stone-400">
              {request.created_at
                ? new Date(request.created_at).toLocaleDateString()
                : ""}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}