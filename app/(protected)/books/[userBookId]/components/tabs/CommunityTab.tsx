// Community Tab
// 

"use client";

type Option = {
  value: string;
  label: string;
};

type CommunityTabProps = {
  isEditingGenres: boolean;
  isEditingContentNotes: boolean;
  singleEditMode?: boolean;
  editing?: boolean;
  saving: boolean;
  onEditGenres: () => void;
  onEditContentNotes: () => void;
  onCancel: () => void;
  onSave: () => void;
  genre: string;
  setGenre: (value: string) => void;
  triggerWarnings: string;
  setTriggerWarnings: (value: string) => void;
  sharedGenres: { value: string; count: number }[];
  sharedContentNotes: { value: string; count: number }[];
  genreLabel: (value: string | null | undefined) => string;
  GENRE_OPTIONS: readonly Option[];
};

function parseTagList(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function dedupeTags(tags: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const tag of tags) {
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }

  return out;
}

function joinTags(tags: string[]) {
  return dedupeTags(tags).join(", ");
}

function isKnownGenre(value: string, options: readonly Option[]) {
  return options.some((option) => option.value === value);
}

function TagChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected?: boolean;
  onClick?: () => void;
}) {
  if (!onClick) {
    return (
      <span className="inline-flex rounded-full border border-stone-300 bg-white px-3 py-1 text-sm text-stone-700">
        {label}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex rounded-full border px-3 py-1 text-sm transition ${selected
          ? "border-sky-400 bg-sky-100 text-sky-950"
          : "border-stone-300 bg-white text-stone-700 hover:bg-stone-100"
        }`}
    >
      {label}
    </button>
  );
}

export default function CommunityTab({
  isEditingGenres,
  isEditingContentNotes,
  singleEditMode = false,
  editing,
  saving,
  onEditGenres,
  onEditContentNotes,
  onCancel,
  onSave,
  genre,
  setGenre,
  triggerWarnings,
  setTriggerWarnings,
  sharedGenres,
  sharedContentNotes,
  genreLabel,
  GENRE_OPTIONS,
}: CommunityTabProps) {
  const selectedGenres = dedupeTags(parseTagList(genre));
  const contentNotes = dedupeTags(parseTagList(triggerWarnings));
  const editingGenres = singleEditMode ? !!editing : isEditingGenres;
  const editingContentNotes = singleEditMode ? !!editing : isEditingContentNotes;
  const customGenres = selectedGenres.filter(
    (value) => !isKnownGenre(value, GENRE_OPTIONS)
  );
  const isOtherSelected = selectedGenres.includes("other") || customGenres.length > 0;

  const toggleGenre = (value: string) => {
    if (value === "other") {
      const next = isOtherSelected
        ? selectedGenres.filter(
          (item) => item !== "other" && isKnownGenre(item, GENRE_OPTIONS)
        )
        : [...selectedGenres, "other"];

      setGenre(joinTags(next));
      return;
    }

    const next = selectedGenres.includes(value)
      ? selectedGenres.filter((item) => item !== value)
      : [...selectedGenres, value];

    setGenre(joinTags(next));
  };

  const setCustomGenreText = (value: string) => {
    const standardGenres = selectedGenres.filter(
      (item) => item !== "other" && isKnownGenre(item, GENRE_OPTIONS)
    );
    const customValues = parseTagList(value);

    setGenre(joinTags([...standardGenres, ...(customValues.length ? customValues : ["other"])]));
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="text-sm font-semibold text-stone-900">Shared with other readers</div>
        <p className="mt-1 text-sm leading-6 text-stone-600">
          Genres and content notes are community tags. What you add here will show up for
          everyone reading this book.
        </p>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-stone-900">Genres</div>
          {!singleEditMode ? (
            !editingGenres ? (
              <button
                type="button"
                onClick={onEditGenres}
                className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-700 transition hover:bg-stone-100"
              >
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onCancel}
                  className="rounded-lg bg-stone-200 px-3 py-1.5 text-sm text-stone-900 transition hover:bg-stone-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSave}
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            )
          ) : null}
        </div>

        {!editingGenres ? (
          sharedGenres.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {sharedGenres.map((tag) => (
                <TagChip
                  key={tag.value}
                  label={`${genreLabel(tag.value)}${tag.count > 1 ? ` (${tag.count})` : ""}`}
                />
              ))}
            </div>
          ) : (
            <div className="text-sm text-stone-500">No genres yet.</div>
          )
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-stone-600">
              Choose the tags you want to add yourself. Shared tags stay visible for everyone.
            </p>
            <div className="flex flex-wrap gap-2">
              {GENRE_OPTIONS.map((option) => (
                <TagChip
                  key={option.value}
                  label={option.label}
                  selected={
                    option.value === "other"
                      ? isOtherSelected
                      : selectedGenres.includes(option.value)
                  }
                  onClick={() => toggleGenre(option.value)}
                />
              ))}
            </div>
            {isOtherSelected ? (
              <div className="rounded-xl border border-stone-200 bg-white p-3">
                <label className="block text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Custom genre
                </label>
                <input
                  value={customGenres.join(", ")}
                  onChange={(event) => setCustomGenreText(event.target.value)}
                  placeholder="Type a genre, or comma-separate a few"
                  className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-stone-300"
                />
                <div className="mt-2 text-xs text-stone-500">
                  This saves as your own shared genre tag for this book.
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-stone-900">Content Notes</div>
          {!singleEditMode ? (
            !editingContentNotes ? (
              <button
                type="button"
                onClick={onEditContentNotes}
                className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-700 transition hover:bg-stone-100"
              >
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onCancel}
                  className="rounded-lg bg-stone-200 px-3 py-1.5 text-sm text-stone-900 transition hover:bg-stone-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSave}
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            )
          ) : null}
        </div>

        {!editingContentNotes ? (
          sharedContentNotes.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {sharedContentNotes.map((note) => (
                <TagChip
                  key={note.value}
                  label={`${note.value}${note.count > 1 ? ` (${note.count})` : ""}`}
                />
              ))}
            </div>
          ) : (
            <div className="text-sm text-stone-500">No content notes yet.</div>
          )
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-stone-600">
              Add your own short reader-facing notes. They will appear as shared tags for everyone.
            </p>
            <textarea
              value={triggerWarnings}
              onChange={(e) => setTriggerWarnings(e.target.value)}
              placeholder="Examples: grief, bullying, violence"
              className="min-h-[96px] w-full rounded-xl border border-stone-300 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-stone-300"
            />
            <div className="text-xs text-stone-500">
              Separate notes with commas or new lines.
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
