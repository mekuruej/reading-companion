import Link from "next/link";

export type TeacherRatingBookCardItem = {
  id: string;
  bookId: string | null;
  title: string;
  author: string | null;
  coverUrl: string | null;
  bookType: string | null;
  learnerName: string;
  recommendedLevel: string | null;
  studentUseRating: number | null;
  languageLearningRating: number | null;
  notes: string | null;
  finishedAt: string | null;
  dnfAt: string | null;
  dnfReason: string | null;
  dnfNote: string | null;
  wouldRetry: string | null;
  teacherReviewClearedAt: string | null;
  hasTeacherReview: boolean;
};

type TeacherRatingBookCardProps = {
  item: TeacherRatingBookCardItem;
  dismissing?: boolean;
  onDismiss?: (item: TeacherRatingBookCardItem) => void;
};

function ratingText(value: number | null) {
  return value == null ? "—" : `${value}/5`;
}

function formatDate(value: string | null) {
  return value ? value.slice(0, 10) : "—";
}

function bookTypeLabel(value: string | null) {
  if (!value) return "Book";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function dnfReasonLabel(value: string | null) {
  switch (value) {
    case "too_difficult_right_now":
      return "Too difficult right now";
    case "wrong_timing_mood":
      return "Wrong timing or mood";
    case "too_much_unknown_vocabulary":
      return "Too much unknown vocabulary";
    case "too_dense_slow":
      return "Too dense or slow";
    case "lost_interest":
      return "Lost interest";
    case "did_not_like_it":
      return "Did not like it";
    case "other":
      return "Other";
    default:
      return "";
  }
}

function wouldRetryLabel(value: string | null) {
  switch (value) {
    case "yes":
      return "Try again";
    case "maybe":
      return "Maybe later";
    case "no":
      return "Probably not";
    default:
      return "";
  }
}

export function TeacherRatingBookCard({
  item,
  dismissing = false,
  onDismiss,
}: TeacherRatingBookCardProps) {
  return (
    <article className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="h-32 w-24 shrink-0 overflow-hidden rounded-2xl border border-stone-200 bg-stone-100">
          {item.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.coverUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center px-3 text-center text-xs font-semibold text-stone-400">
              No cover
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-stone-500">
              {bookTypeLabel(item.bookType)}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-black ${item.hasTeacherReview
                ? "bg-emerald-50 text-emerald-700"
                : item.teacherReviewClearedAt
                  ? "bg-stone-100 text-stone-600"
                : "bg-amber-50 text-amber-700"
                }`}
            >
              {item.hasTeacherReview
                ? "Rated"
                : item.teacherReviewClearedAt
                  ? "Dismissed"
                  : "Needs rating"}
            </span>
          </div>

          <h2 className="mt-3 text-xl font-black leading-tight text-stone-900">
            {item.title}
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            {item.author || "Unknown author"} · {item.learnerName}
          </p>

          <dl className="mt-4 grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-stone-50 p-3">
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">
                Level
              </dt>
              <dd className="mt-1 text-sm font-black text-stone-900">
                {item.recommendedLevel || "—"}
              </dd>
            </div>
            <div className="rounded-2xl bg-stone-50 p-3">
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">
                Lesson fit
              </dt>
              <dd className="mt-1 text-sm font-black text-stone-900">
                {ratingText(item.studentUseRating)}
              </dd>
            </div>
            <div className="rounded-2xl bg-stone-50 p-3">
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">
                Language
              </dt>
              <dd className="mt-1 text-sm font-black text-stone-900">
                {ratingText(item.languageLearningRating)}
              </dd>
            </div>
            <div className="rounded-2xl bg-stone-50 p-3">
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-400">
                Finished
              </dt>
              <dd className="mt-1 text-sm font-black text-stone-900">
                {formatDate(item.finishedAt || item.dnfAt)}
              </dd>
            </div>
          </dl>

          {item.notes?.trim() ? (
            <p className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-3 text-sm leading-6 text-stone-700">
              {item.notes}
            </p>
          ) : null}

          {item.dnfAt && (item.dnfReason || item.wouldRetry || item.dnfNote) ? (
            <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm leading-6 text-rose-950">
              <div className="font-black">DNF context</div>
              {item.dnfReason ? (
                <div className="mt-1">Reason: {dnfReasonLabel(item.dnfReason)}</div>
              ) : null}
              {item.wouldRetry ? (
                <div>Retry: {wouldRetryLabel(item.wouldRetry)}</div>
              ) : null}
              {item.dnfNote ? <div>Note: {item.dnfNote}</div> : null}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/teacher/books/${encodeURIComponent(item.id)}`}
              className="rounded-full bg-stone-900 px-4 py-2 text-sm font-black text-white hover:bg-stone-700"
            >
              Open teacher review
            </Link>
            <Link
              href={`/books/${encodeURIComponent(item.id)}`}
              className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-black text-stone-700 hover:border-stone-400"
            >
              Book Hub
            </Link>
            {onDismiss ? (
              <button
                type="button"
                onClick={() => onDismiss(item)}
                disabled={dismissing}
                className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-black text-stone-600 hover:border-stone-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {dismissing ? "Dismissing..." : "Dismiss request"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
