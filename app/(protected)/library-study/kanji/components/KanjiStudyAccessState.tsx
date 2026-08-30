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
  const isBackLink = Boolean(primaryHref && primaryLabel?.startsWith("Back"));

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-xl flex-col justify-center">
        {isBackLink && primaryHref && primaryLabel ? (
          <Link
            href={primaryHref}
            className="mb-4 inline-flex text-sm font-semibold text-slate-500 hover:text-slate-900"
          >
            ← {primaryLabel}
          </Link>
        ) : null}

      <div className="w-full rounded-2xl border bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">
          {title}
        </h1>

        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
          {message}
        </p>

        {primaryHref && primaryLabel && !isBackLink ? (
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
      </div>
    </main>
  );
}
