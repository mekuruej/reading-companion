type ProfilePreviewDetailsGridProps = {
  publicLevelLabel: string;
  favoriteGenres: string[];
};

export default function ProfilePreviewDetailsGrid({
  publicLevelLabel,
  favoriteGenres,
}: ProfilePreviewDetailsGridProps) {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-stone-100 p-4">
        <div className="text-xs font-black uppercase tracking-[0.16em] text-stone-400">
          Public level
        </div>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          {publicLevelLabel}
        </p>
      </div>

      <div className="rounded-2xl border border-stone-100 p-4">
        <div className="text-xs font-black uppercase tracking-[0.16em] text-stone-400">
          Favorite genres
        </div>

        {favoriteGenres.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {favoriteGenres.map((genre) => (
              <span
                key={genre}
                className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold text-stone-600"
              >
                {genre}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Not shown yet.
          </p>
        )}
      </div>
    </div>
  );
}