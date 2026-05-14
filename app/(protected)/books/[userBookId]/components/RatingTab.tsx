// Rating Tab
// 

"use client";

import { useState, type ComponentType } from "react";
import Link from "next/link";
import CommunityTab from "./CommunityTab";

type Option = {
  value: string;
  label: string;
};

type UserBook = {
  my_review: string | null;
  rating_overall: number | null;
  rating_difficulty: number | null;
  reader_level: string | null;
  favorite_quotes?: string | null;
  memorable_words?: string | null;
};

type RatingTabProps = {
  row: UserBook;

  onSave: () => void | Promise<void>;
  onSaveReaderFit: () => void | Promise<void>;
  onSaveCommunity: () => void | Promise<void>;
  saving?: boolean;
  isEditingReaderFit: boolean;
  isEditingGenres: boolean;
  isEditingContentNotes: boolean;
  onEditReaderFit: () => void;
  onEditGenres: () => void;
  onEditContentNotes: () => void;
  onCancel: () => void;

  myReview: string;
  setMyReview: (value: string) => void;

  ratingOverall: string;
  setRatingOverall: (value: string) => void;

  readerLevel: string;
  profileLevel: string;
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

function CardHeader({
  title,
  editing,
  onEdit,
  onCancel,
  onSave,
  saving = false,
}: {
  title: string;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void | Promise<void>;
  saving?: boolean;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="text-sm font-semibold text-stone-900">{title}</div>

      {!editing ? (
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-700 transition hover:bg-stone-50"
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
  );
}

export default function RatingTab({
  row,
  onSave,
  onSaveReaderFit,
  onSaveCommunity,
  saving = false,
  isEditingReaderFit,
  isEditingGenres,
  isEditingContentNotes,
  onEditReaderFit,
  onEditGenres,
  onEditContentNotes,
  onCancel,
  myReview,
  setMyReview,
  ratingOverall,
  setRatingOverall,
  readerLevel,
  profileLevel,
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
  const [editingReview, setEditingReview] = useState(false);
  const [editingRatings, setEditingRatings] = useState(false);
  const [editingMemory, setEditingMemory] = useState(false);

  function cancelReview() {
    setMyReview(row.my_review ?? "");
    setEditingReview(false);
  }

  function cancelRatings() {
    setRatingOverall(row.rating_overall != null ? String(row.rating_overall) : "");
    setEditingRatings(false);
  }

  function cancelMemory() {
    setFavoriteQuotes(row.favorite_quotes ?? "");
    setMemorableWords(row.memorable_words ?? "");
    setEditingMemory(false);
  }

  async function saveReview() {
    await onSave();
    setEditingReview(false);
  }

  async function saveRatings() {
    await onSave();
    setEditingRatings(false);
  }

  async function saveReaderFit() {
    await onSaveReaderFit();
  }

  async function saveMemory() {
    await onSave();
    setEditingMemory(false);
  }

  const currentLevelInfo =
    READER_LEVEL_OPTIONS.find((option) => option.value === (row.reader_level ?? readerLevel)) ??
    null;
  const effectiveProfileLevel = profileLevel || readerLevel;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <CardHeader
          title="My Review"
          editing={editingReview}
          onEdit={() => setEditingReview(true)}
          onCancel={cancelReview}
          onSave={saveReview}
          saving={saving}
        />

        {!editingReview ? (
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

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <CardHeader
          title="Ratings"
          editing={editingRatings}
          onEdit={() => setEditingRatings(true)}
          onCancel={cancelRatings}
          onSave={saveRatings}
          saving={saving}
        />

        <div className="grid grid-cols-1 gap-3">
          <StarRatingField
            label="Entertainment Rating"
            value={row.rating_overall}
            editing={editingRatings}
            inputValue={ratingOverall}
            setInputValue={setRatingOverall}
            descriptions={{
              5: "Exceptional! Already want to read it again!",
              4: "Very good! Definitely will recommend it.",
              3: "Good solid book.",
              2: "Not bad, but I would have liked to read something else.",
              1: "Didn’t like it.",
            }}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <CardHeader
          title="Reading Fit"
          editing={isEditingReaderFit}
          onEdit={onEditReaderFit}
          onCancel={onCancel}
          onSave={saveReaderFit}
          saving={saving}
        />

        <div className="mb-4 rounded-xl border border-stone-200 bg-white px-3 py-3 text-sm leading-6 text-stone-700">
          No one sees your answer here. This helps Mekuru understand how the book felt for
          readers at different Japanese levels.
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded border bg-white p-3 text-sm">
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
            {isEditingReaderFit ? (
              <div className="mt-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs leading-5 text-stone-600">
                This uses your Japanese Reading Level from your profile for this book.
              </div>
            ) : null}
            <div className="mt-3 text-xs leading-5 text-stone-500">
              Has your level changed?{" "}
              <Link href="/community/profile/setup" className="font-medium underline underline-offset-4">
                Change it in Profile Details
              </Link>
              .
            </div>
            {isEditingReaderFit && effectiveProfileLevel ? (
              <div className="mt-2 text-xs text-stone-500">
                Saving will use {effectiveProfileLevel}.
              </div>
            ) : null}
          </div>

          <DifficultyField
            value={row.rating_difficulty}
            editing={isEditingReaderFit}
            inputValue={ratingDifficulty}
            setInputValue={setRatingDifficulty}
          />
        </div>
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
          isEditingGenres={isEditingGenres}
          isEditingContentNotes={isEditingContentNotes}
          saving={saving}
          onEditGenres={onEditGenres}
          onEditContentNotes={onEditContentNotes}
          onCancel={onCancel}
          onSave={onSaveCommunity}
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
        <CardHeader
          title="Reading Memory"
          editing={editingMemory}
          onEdit={() => setEditingMemory(true)}
          onCancel={cancelMemory}
          onSave={saveMemory}
          saving={saving}
        />

        {!editingMemory ? (
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
    </div>
  );
}
