type TeacherSnapshotHeaderProps = {
  title: string;
  author: string | null;
  coverUrl: string | null;
  statusLabel?: string | null;
};

export default function TeacherSnapshotHeader({
  title,
  author,
  coverUrl,
  statusLabel,
}: TeacherSnapshotHeaderProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div className="grid gap-0 md:grid-cols-[128px_1fr]">
        <div className="bg-stone-200">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt=""
              className="h-full min-h-[172px] w-full object-cover"
            />
          ) : (
            <div className="flex h-full min-h-[172px] items-center justify-center px-4 text-center text-xs font-semibold text-stone-500">
              No cover
            </div>
          )}
        </div>

        <div className="flex flex-col justify-center gap-4 p-5 sm:p-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-400">
                Teacher Reading Snapshot
              </p>
              {statusLabel ? (
                <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-bold text-stone-600">
                  {statusLabel}
                </span>
              ) : null}
            </div>

            <h1 className="mt-2 text-2xl font-black leading-tight text-stone-950 sm:text-3xl">
              {title}
            </h1>

            {author ? (
              <p className="mt-1 text-sm font-medium text-stone-600">{author}</p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
