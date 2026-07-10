import Link from "next/link";

type ExternalLink = {
  label: string;
  url: string;
};

type EnglishReaderBookCardProps = {
  title: string;
  author: string | null;
  recommendedLevel: string | null;
  isbn13: string | null;
  externalLink: ExternalLink | null;
  workspaceHref: string;
};

export default function EnglishReaderBookCard({
  title,
  author,
  recommendedLevel,
  isbn13,
  externalLink,
  workspaceHref,
}: EnglishReaderBookCardProps) {
  return (
    <article className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
            English Reader
          </p>
          <h2 className="mt-2 text-xl font-black text-stone-900">{title}</h2>
          {author ? (
            <p className="mt-1 text-sm font-medium text-stone-600">{author}</p>
          ) : null}
        </div>

        <Link
          href={workspaceHref}
          className="shrink-0 rounded-2xl bg-stone-900 px-4 py-2 text-center text-sm font-black text-white shadow-sm transition hover:bg-stone-800"
        >
          Open Workspace
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
        {recommendedLevel ? (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-800">
            Level {recommendedLevel}
          </span>
        ) : null}
        <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-stone-600">
          {isbn13 ? `ISBN ${isbn13}` : "No ISBN"}
        </span>
      </div>

      {externalLink ? (
        <a
          href={externalLink.url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex max-w-full text-sm font-semibold text-stone-700 underline decoration-stone-300 underline-offset-4 transition hover:text-stone-950"
        >
          <span className="truncate">{externalLink.label}</span>
        </a>
      ) : null}
    </article>
  );
}
