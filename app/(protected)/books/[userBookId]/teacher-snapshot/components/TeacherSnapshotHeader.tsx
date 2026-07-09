import Link from "next/link";

type TeacherSnapshotHeaderProps = {
  title: string;
  author: string | null;
  coverUrl: string | null;
  readerBookHref: string;
};

export default function TeacherSnapshotHeader({
  title,
  author,
  coverUrl,
  readerBookHref,
}: TeacherSnapshotHeaderProps) {
  return (
    <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
      <div className="grid gap-0 md:grid-cols-[180px_1fr]">
        <div className="bg-stone-200">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt=""
              className="h-full min-h-[240px] w-full object-cover"
            />
          ) : (
            <div className="flex h-full min-h-[240px] items-center justify-center px-6 text-center text-sm font-semibold text-stone-500">
              No cover
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between gap-6 p-6 sm:p-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-400">
              Teacher Reading Snapshot
            </p>

            <h1 className="mt-3 text-3xl font-black leading-tight text-stone-950 sm:text-4xl">
              {title}
            </h1>

            {author ? (
              <p className="mt-2 text-base font-medium text-stone-600">{author}</p>
            ) : null}

            <p className="mt-5 max-w-2xl text-sm leading-6 text-stone-600">
              This snapshot shows your reading history and teaching notes for this book.
              Open the Teacher Book Workspace when you&apos;re ready to teach or prepare
              support.
            </p>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">
              The full Reader Book Hub still has the complete reader tools and book
              details.
            </p>
          </div>

          <div>
            <Link
              href={readerBookHref}
              className="inline-flex rounded-2xl border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-semibold text-stone-800 transition hover:bg-stone-100"
            >
              Open Reader Book Hub
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
