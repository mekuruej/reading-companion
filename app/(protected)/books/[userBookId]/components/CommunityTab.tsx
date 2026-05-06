// Community Tab
// 

"use client";

import Link from "next/link";

type Option = {
  value: string;
  label: string;
};

type CommunityTabProps = {
  isEditingGenres: boolean;
  isEditingContentNotes: boolean;
  isEditingReaderFit: boolean;
  saving: boolean;
  onEditGenres: () => void;
  onEditContentNotes: () => void;
  onEditReaderFit: () => void;
  onCancel: () => void;
  onSave: () => void;
  genre: string;
  setGenre: (value: string) => void;
  triggerWarnings: string;
  setTriggerWarnings: (value: string) => void;
  readerLevel: string;
  setReaderLevel: (value: string) => void;
  ratingDifficulty: string;
  setRatingDifficulty: (value: string) => void;
  sharedGenres: { value: string; count: number }[];
  sharedContentNotes: { value: string; count: number }[];
  genreLabel: (value: string | null | undefined) => string;
  GENRE_OPTIONS: readonly Option[];
  LEVEL_OPTIONS: readonly string[];
};

const READER_LEVEL_OPTIONS = [
  { value: "Level 1", label: "Absolute Beginner", cefr: "Pre-A1", jlpt: "Before N5" },
  { value: "Level 2", label: "Beginner 1", cefr: "A1", jlpt: "Early N5" },
  { value: "Level 3", label: "Beginner 2", cefr: "A1+", jlpt: "Solid N5" },
  { value: "Level 4", label: "Upper Beginner", cefr: "A2", jlpt: "N4 entry" },
  { value: "Level 5", label: "Pre-Intermediate", cefr: "A2+", jlpt: "Solid N4" },
  { value: "Level 6", label: "Intermediate 1", cefr: "B1", jlpt: "N3 entry" },
  { value: "Level 7", label: "Intermediate 2", cefr: "B1+", jlpt: "Solid N3" },
  { value: "Level 8", label: "Upper Intermediate", cefr: "B2-ish", jlpt: "N2 entry" },
  { value: "Level 9", label: "Advanced", cefr: "B2+", jlpt: "Solid N2 / N1 entry" },
  { value: "Level 10", label: "Upper Advanced", cefr: "C1-ish", jlpt: "Solid N1+" },
] as const;

const DIFFICULTY_OPTIONS = [
  { value: 1, label: "Very hard for me" },
  { value: 2, label: "Hard, but manageable" },
  { value: 3, label: "A stretch, but okay" },
  { value: 4, label: "Comfortable overall" },
  { value: 5, label: "Very comfortable" },
] as const;

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
      className={`inline-flex rounded-full border px-3 py-1 text-sm transition ${
        selected
          ? "border-emerald-500 bg-emerald-100 text-emerald-900"
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
  isEditingReaderFit,
  saving,
  onEditGenres,
  onEditContentNotes,
  onEditReaderFit,
  onCancel,
  onSave,
  genre,
  setGenre,
  triggerWarnings,
  setTriggerWarnings,
  readerLevel,
  setReaderLevel,
  ratingDifficulty,
  setRatingDifficulty,
  sharedGenres,
  sharedContentNotes,
  genreLabel,
  GENRE_OPTIONS,
  LEVEL_OPTIONS,
}: CommunityTabProps) {
  const selectedGenres = dedupeTags(parseTagList(genre));
  const contentNotes = dedupeTags(parseTagList(triggerWarnings));
  const currentLevelInfo =
    READER_LEVEL_OPTIONS.find((option) => option.value === readerLevel) ?? null;
  const currentDifficultyValue = ratingDifficulty ? Number(ratingDifficulty) : null;
  const currentDifficultyInfo =
    DIFFICULTY_OPTIONS.find((option) => option.value === currentDifficultyValue) ?? null;

  const toggleGenre = (value: string) => {
    const next = selectedGenres.includes(value)
      ? selectedGenres.filter((item) => item !== value)
      : [...selectedGenres, value];

    setGenre(joinTags(next));
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="text-sm font-semibold text-emerald-900">Shared with other readers</div>
        <p className="mt-1 text-sm leading-6 text-emerald-900/85">
          Genres and content notes are community tags. What you add here will show up for
          everyone reading this book.
        </p>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-stone-900">Genres</div>
          {!isEditingGenres ? (
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
          )}
        </div>

        {!isEditingGenres ? (
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
                  selected={selectedGenres.includes(option.value)}
                  onClick={() => toggleGenre(option.value)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-stone-900">Content Notes</div>
          {!isEditingContentNotes ? (
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
          )}
        </div>

        {!isEditingContentNotes ? (
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

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-stone-900">Reading Fit Signals</div>
          {!isEditingReaderFit ? (
            <button
              type="button"
              onClick={onEditReaderFit}
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
          )}
        </div>

        <div className="mb-4 rounded-xl border border-stone-200 bg-white px-3 py-3 text-sm leading-6 text-stone-700">
          No one sees your answer here. We are collecting this data to help build a
          future "find your next book" search based on reader level and how books
          actually felt.
        </div>

        {!isEditingReaderFit ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-stone-200 bg-white p-3 text-sm">
              <div className="text-stone-600">My Level at Time of Reading</div>
              {currentLevelInfo ? (
                <div className="mt-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-3">
                  <div className="font-medium text-stone-900">
                    {currentLevelInfo.value} · {currentLevelInfo.label}
                  </div>
                  <div className="mt-1 text-xs text-stone-500">
                    {currentLevelInfo.cefr} · {currentLevelInfo.jlpt}
                  </div>
                </div>
              ) : (
                <div className="mt-2 font-medium text-stone-900">—</div>
              )}
              <div className="mt-3 text-xs leading-5 text-stone-500">
                Has your level changed?{" "}
                <Link href="/community/profile/setup" className="font-medium underline underline-offset-4">
                  Change it in Profile Details
                </Link>
                .
              </div>
            </div>

            <div className="rounded-xl border border-stone-200 bg-white p-3 text-sm">
              <div className="text-stone-600">Difficulty for Me</div>
              <div className="mt-1 text-xs text-stone-500">1 = hardest · 5 = easiest</div>
              <div className="mt-2 font-medium text-stone-900">
                {currentDifficultyValue ? `${currentDifficultyValue}/5` : "—"}
              </div>
              <div className="mt-1 text-xs text-stone-500">
                {currentDifficultyInfo?.label ?? "—"}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-stone-200 bg-white p-3 text-sm">
              <div className="text-stone-600">My Level at Time of Reading</div>
              <div className="mt-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs leading-5 text-stone-600">
                This now uses your Japanese Reading Level from Profile Home as the
                answer for this book.
              </div>
              {currentLevelInfo ? (
                <div className="mt-3 rounded-lg border border-stone-200 bg-white px-3 py-3">
                  <div className="font-medium text-stone-900">
                    {currentLevelInfo.value} · {currentLevelInfo.label}
                  </div>
                  <div className="mt-1 text-xs text-stone-500">
                    {currentLevelInfo.cefr} · {currentLevelInfo.jlpt}
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-lg border border-stone-200 bg-white px-3 py-3 font-medium text-stone-900">
                  —
                </div>
              )}
              <div className="mt-3 text-xs leading-5 text-stone-500">
                Has your level changed?{" "}
                <Link href="/community/profile/setup" className="font-medium underline underline-offset-4">
                  Change it in Profile Details
                </Link>
                .
              </div>
            </div>

            <div className="rounded-xl border border-stone-200 bg-white p-3 text-sm">
              <div className="text-stone-600">Difficulty for Me</div>
              <div className="mt-1 text-xs text-stone-500">1 = hardest · 5 = easiest</div>
              <div className="mt-3 space-y-2">
                {DIFFICULTY_OPTIONS.map((option) => {
                  const isSelected = currentDifficultyValue === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRatingDifficulty(String(option.value))}
                      className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                        isSelected
                          ? "border-stone-900 bg-stone-100"
                          : "border-stone-200 bg-white hover:bg-stone-50"
                      }`}
                    >
                      <div className="font-medium text-stone-900">{option.value}/5</div>
                      <div className="text-xs text-stone-500">{option.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
