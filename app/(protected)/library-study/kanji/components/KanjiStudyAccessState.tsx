import Link from "next/link";

type KanjiStudyAccessStateProps = {
  title: string;
  message: string;
  primaryHref?: string;
  primaryLabel?: string;
};

export default function KanjiStudyAccessState({
  title,
  message,
  primaryHref,
  primaryLabel,
}: KanjiStudyAccessStateProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-100 p-6">
      <div className="w-full max-w-xl rounded-2xl border bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">
          {title}
        </h1>

        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
          {message}
        </p>

        {primaryHref && primaryLabel ? (
          <div className="mt-6">
            <Link
              href={primaryHref}
              className="inline-flex rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              {primaryLabel}
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}