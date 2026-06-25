import Link from "next/link";

type TeacherAlertSummary = {
  title: string;
  href?: string;
  count: number;
  description: string;
  badgeLabel?: string;
  hasToday?: boolean;
  placeholder?: boolean;
  sortDate?: string | null;
};

type TeacherAlertListProps = {
  alerts: TeacherAlertSummary[];
  emptyText: string;
};

function formatAlertCount(count: number) {
  if (count <= 0) return "None";
  if (count > 99) return "99+";
  return String(count);
}

export function TeacherAlertList({
  alerts,
  emptyText,
}: TeacherAlertListProps) {
  if (alerts.length === 0) {
    return <p className="mt-3 text-sm leading-6 text-stone-600">{emptyText}</p>;
  }

  return (
    <div className="mt-4 space-y-3">
      {alerts.map((alert) => (
        <div
          key={alert.title}
          className={`flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between ${
            alert.href ? "transition hover:-translate-y-0.5 hover:shadow-md" : ""
          }`}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-black text-stone-900">{alert.title}</h4>

              {alert.badgeLabel ? (
                <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-black text-sky-700">
                  {alert.badgeLabel}
                </span>
              ) : null}

              {alert.hasToday ? (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">
                  Today
                </span>
              ) : null}
            </div>

            <p className="mt-1 text-sm leading-5 text-stone-600">
              {alert.description}
            </p>

            {alert.href ? (
              <Link
                href={alert.href}
                className="mt-2 inline-flex text-sm font-semibold text-stone-900 hover:text-stone-600"
              >
                Open →
              </Link>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
            <span
              className={`rounded-full px-3 py-1 text-sm font-black ${
                alert.count > 0
                  ? "bg-amber-100 text-amber-900"
                  : "bg-stone-100 text-stone-500"
              }`}
            >
              {alert.placeholder ? "Soon" : formatAlertCount(alert.count)}
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
              {alert.placeholder ? "Planned" : "Items"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
