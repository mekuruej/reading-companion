// Rating Tab

"use client";

import type { ComponentType } from "react";
import CommunityTab from "./CommunityTab";

type Option = {
  value: string;
  label: string;
};

type UserBook = {
  my_review: string | null;
  reader_advice: string | null;
  rating_overall: number | null;
  rating_difficulty: number | null;
  reader_level: string | null;
  favorite_quotes?: string | null;
  memorable_words?: string | null;
};

type RatingTabProps = {
  row: UserBook;

  onSaveReflection: () => void | Promise<void>;
  saving?: boolean;
  isEditingReflection: boolean;
  onEditReflection: () => void;
  onCancel: () => void;

  myReview: string;
  setMyReview: (value: string) => void;

  readerAdvice: string;
  setReaderAdvice: (value: string) => void;

  ratingOverall: string;
  setRatingOverall: (value: string) => void;

  profileLevel: string;
  bookType: string | null;
  ratingDifficulty: string;
  setRatingDifficulty: (value: string) => void;

  favoriteQuotes: string;
  setFavoriteQuotes: (value: string) => void;

  memorableWords: string;
  setMemorableWords: (value: string) => void;

  genre: string;
  setGenre: (value: string) => void;
  triggerWarnings: string;
  setTriggerWarnings: (value: string) => void;
  sharedGenres: { value: string; count: number }[];
  sharedContentNotes: { value: string; count: number }[];
  genreLabel: (value: string | null | undefined) => string;
  GENRE_OPTIONS: readonly Option[];

  StarRatingField: ComponentType<{
    label: string;
    value: number | null;
    editing: boolean;
    inputValue: string;
    setInputValue: (v: string) => void;
    descriptions: Record<number, string>;
  }>;
  DifficultyField: ComponentType<{
    value: number | null;
    editing: boolean;
    bookType: string | null;
    inputValue: string;
    setInputValue: (v: string) => void;
  }>;
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

const READER_ADVICE_MAX_LENGTH = 120;

function ReflectionControls({
  editing,
  saving,
  onEdit,
  onCancel,
  onSave,
}: {
  editing: boolean;
  saving: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void | Promise<void>;
}) {
  if (!editing) {
    return (
      <button
        type="button"
        onClick={onEdit}
        className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
      >
        Edit Reflection
      </button>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg bg-stone-200 px-4 py-2 text-sm font-semibold text-stone-900 transition hover:bg-stone-300"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Reflection"}
      </button>
    </div>
  );
}

export default function RatingTab({
  row,
  onSaveReflection,
  saving = false,
  isEditingReflection,
  onEditReflection,
  onCancel,
  myReview,
  setMyReview,
  readerAdvice,
  setReaderAdvice,
  ratingOverall,
  setRatingOverall,
  profileLevel,
  bookType,
  ratingDifficulty,
  setRatingDifficulty,
  favoriteQuotes,
  setFavoriteQuotes,
  memorableWords,
  setMemorableWords,
  genre,
  setGenre,
  triggerWarnings,
  setTriggerWarnings,
  sharedGenres,
  sharedContentNotes,
  genreLabel,
  GENRE_OPTIONS,
  StarRatingField,
  DifficultyField,
}: RatingTabProps) {
  const currentLevelInfo =
    READER_LEVEL_OPTIONS.find((option) => option.value === profileLevel) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <ReflectionControls
          editing={isEditingReflection}
          saving={saving}
          onEdit={onEditReflection}
          onCancel={onCancel}
          onSave={onSaveReflection}
        />
      </div>

      <div
        id="reader-difficulty-section"
        className="rounded-2xl border border-stone-200 bg-stone-50 p-4 scroll-mt-6"
      >
        <div className="mb-3 text-sm font-semibold text-stone-900">
          Reader Difficulty
        </div>

        <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-3 py-3 text-sm leading-6 text-sky-950">
          Ratings, including entertainment and difficulty, will appear anonymously in Find
          Your Next Book to help readers filter for books that fit them. Your profile remains
          anonymous.
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded border bg-white p-3 text-sm">
            <div className="text-stone-600">Reader level from profile</div>
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
              <div className="mt-2 font-medium text-stone-900">
                {profileLevel ? profileLevel.replace(/_/g, " ") : "—"}
              </div>
            )}
            <div className="mt-3 text-xs leading-5 text-stone-500">
              Reader level comes from your profile. Change it in Profile Settings if needed.
            </div>
          </div>

          <DifficultyField
            value={row.rating_difficulty}
            editing={isEditingReflection}
            bookType={bookType}
            inputValue={ratingDifficulty}
            setInputValue={setRatingDifficulty}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="mb-3 text-sm font-semibold text-stone-900">
          Entertainment Rating
        </div>

        <div className="grid grid-cols-1 gap-3">
          <StarRatingField
            label="Entertainment Rating"
            value={row.rating_overall}
            editing={isEditingReflection}
            inputValue={ratingOverall}
            setInputValue={setRatingOverall}
            descriptions={{
              1: "Not for me / did not enjoy much.",
              2: "Some parts worked, but I would not rush to recommend it.",
              3: "Good solid book.",
              4: "Very good! Definitely will recommend it.",
              5: "Loved it / highly recommend.",
            }}
          />
        </div>

        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
          Ratings, including entertainment and difficulty, will appear anonymously in Find
          Your Next Book to help readers filter for books that fit them. Your profile remains
          anonymous.
        </p>
      </div>

      <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4">
        <div className="mb-3 text-sm font-semibold text-sky-950">
          Advice to a Reader
        </div>

        {!isEditingReflection ? (
          <div className="min-h-[64px] whitespace-pre-wrap rounded border border-sky-100 bg-white p-3 text-sm leading-6 text-stone-700">
            {row.reader_advice?.trim() ? row.reader_advice : "—"}
          </div>
        ) : (
          <>
            <textarea
              value={readerAdvice}
              maxLength={READER_ADVICE_MAX_LENGTH}
              onChange={(e) =>
                setReaderAdvice(e.target.value.slice(0, READER_ADVICE_MAX_LENGTH))
              }
              placeholder="A tiny note for the next reader…"
              className="min-h-[90px] w-full rounded border bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-sky-200"
            />
            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-sky-900/75">
              <span>Short and practical works best.</span>
              <span>
                {readerAdvice.length}/{READER_ADVICE_MAX_LENGTH}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-center">
        <ReflectionControls
          editing={isEditingReflection}
          saving={saving}
          onEdit={onEditReflection}
          onCancel={onCancel}
          onSave={onSaveReflection}
        />
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="mb-3 text-sm font-semibold text-stone-900">My Review</div>

        {!isEditingReflection ? (
          <div className="min-h-[140px] whitespace-pre-wrap text-sm text-stone-700">
            {row.my_review?.trim() ? row.my_review : "—"}
          </div>
        ) : (
          <textarea
            value={myReview}
            onChange={(e) => setMyReview(e.target.value)}
            placeholder="Write your review here…"
            className="min-h-[160px] w-full rounded border p-3 text-sm outline-none focus:ring-2 focus:ring-stone-300"
          />
        )}
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
        <div className="mb-4">
          <div className="text-sm font-semibold text-emerald-950">
            Help other readers
          </div>
          <p className="mt-1 text-sm leading-6 text-emerald-900/85">
            These optional fields are shared community tags. They help future readers
            understand what kind of book this is.
          </p>
        </div>

        <CommunityTab
          singleEditMode
          editing={isEditingReflection}
          isEditingGenres={false}
          isEditingContentNotes={false}
          saving={saving}
          onEditGenres={onEditReflection}
          onEditContentNotes={onEditReflection}
          onCancel={onCancel}
          onSave={onSaveReflection}
          genre={genre}
          setGenre={setGenre}
          triggerWarnings={triggerWarnings}
          setTriggerWarnings={setTriggerWarnings}
          sharedGenres={sharedGenres}
          sharedContentNotes={sharedContentNotes}
          genreLabel={genreLabel}
          GENRE_OPTIONS={GENRE_OPTIONS}
        />
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="mb-3 text-sm font-semibold text-stone-900">
          Reading Memory
        </div>

        {!isEditingReflection ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded border bg-white p-3 text-sm">
              <div className="text-stone-600">Favorite Quotes</div>
              <div className="mt-1 min-h-[100px] whitespace-pre-wrap text-stone-700">
                {favoriteQuotes.trim() ? favoriteQuotes : "—"}
              </div>
            </div>

            <div className="rounded border bg-white p-3 text-sm">
              <div className="text-stone-600">Memorable Words</div>
              <div className="mt-1 min-h-[100px] whitespace-pre-wrap text-stone-700">
                {memorableWords.trim() ? memorableWords : "—"}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded border bg-white p-3 text-sm">
              <div className="mb-2 text-stone-600">Favorite Quotes</div>
              <textarea
                value={favoriteQuotes}
                onChange={(e) => setFavoriteQuotes(e.target.value)}
                placeholder="Add favorite quotes here…"
                className="min-h-[140px] w-full rounded border p-3 text-sm outline-none focus:ring-2 focus:ring-stone-300"
              />
              <div className="mt-2 text-xs text-stone-500">
                One quote per line works nicely.
              </div>
            </div>

            <div className="rounded border bg-white p-3 text-sm">
              <div className="mb-2 text-stone-600">5 Memorable Words</div>
              <textarea
                value={memorableWords}
                onChange={(e) => setMemorableWords(e.target.value)}
                placeholder="List memorable words here…"
                className="min-h-[140px] w-full rounded border p-3 text-sm outline-none focus:ring-2 focus:ring-stone-300"
              />
              <div className="mt-2 text-xs text-stone-500">
                One word per line is easiest.
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center">
        <ReflectionControls
          editing={isEditingReflection}
          saving={saving}
          onEdit={onEditReflection}
          onCancel={onCancel}
          onSave={onSaveReflection}
        />
      </div>
    </div>
  );
}
