type CommunityStatsHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export default function CommunityStatsHeader({
  eyebrow,
  title,
  description,
}: CommunityStatsHeaderProps) {
  return (
    <section className="mb-4 overflow-hidden rounded-[1.5rem] border border-white/70 bg-white shadow-sm">
      <div className="relative bg-gradient-to-br from-sky-100 via-amber-50 to-emerald-100 p-5 md:p-6">
        <div className="grid gap-5 md:grid-cols-[140px_minmax(0,1fr)] md:items-center">
          <div className="flex h-28 w-28 items-center justify-center rounded-[1.25rem] border-[4px] border-white bg-stone-950 text-4xl font-black text-white shadow-lg md:h-36 md:w-36">
            S
          </div>

          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-stone-600 shadow-sm">
                {eyebrow}
              </span>
            </div>

            <h1 className="text-4xl font-black leading-none text-stone-950 md:text-5xl">
              {title}
            </h1>

            <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-stone-700 md:text-base md:leading-7">
              {description}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
