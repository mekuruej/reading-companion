import Link from "next/link";

type EnglishReaderAction = {
  title: string;
  eyebrow: string;
  description: string;
  status: "Coming soon" | "Later";
  href?: string;
};

type EnglishReadersActionGridProps = {
  actions: EnglishReaderAction[];
};

export default function EnglishReadersActionGrid({
  actions,
}: EnglishReadersActionGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {actions.map((action) => (
        <div
          key={action.title}
          className="h-full rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
              {action.eyebrow}
            </p>

            <span className="shrink-0 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-semibold text-stone-500">
              {action.status}
            </span>
          </div>

          <h2 className="mt-3 text-xl font-black text-stone-900">{action.title}</h2>

          <p className="mt-3 text-sm leading-6 text-stone-600">
            {action.description}
          </p>

          {action.href ? (
            <Link
              href={action.href}
              className="mt-4 inline-flex rounded-2xl bg-stone-900 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-stone-800"
            >
              Open
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="mt-4 rounded-2xl border border-stone-200 bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-400"
            >
              Not available yet
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
