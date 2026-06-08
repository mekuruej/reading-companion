type FavoriteGenreEditorProps = {
  favoriteGenres: string[];
  favoriteGenreInput: string;
  onFavoriteGenreInputChange: (value: string) => void;
  onAddFavoriteGenres: () => void;
  onRemoveFavoriteGenre: (genre: string) => void;
};

export default function FavoriteGenreEditor({
  favoriteGenres,
  favoriteGenreInput,
  onFavoriteGenreInputChange,
  onAddFavoriteGenres,
  onRemoveFavoriteGenre,
}: FavoriteGenreEditorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-stone-800">
        Favorite genres
      </label>

      <p className="mt-1 text-xs text-stone-500">
        Add one or more genres, then press Enter or click Add.
      </p>

      <div className="mt-2 flex gap-2">
        <input
          type="text"
          className="w-full rounded-xl border px-3 py-2"
          placeholder="fantasy, slice-of-life"
          value={favoriteGenreInput}
          onChange={(e) => onFavoriteGenreInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAddFavoriteGenres();
            }
          }}
        />

        <button
          type="button"
          onClick={onAddFavoriteGenres}
          className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
        >
          Add
        </button>
      </div>

      {favoriteGenres.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {favoriteGenres.map((genre) => (
            <button
              key={genre}
              type="button"
              onClick={() => onRemoveFavoriteGenre(genre)}
              className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-700 hover:bg-stone-100"
            >
              {genre} ×
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}