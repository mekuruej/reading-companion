"use client";

import { useState, type ComponentType } from "react";

type UserBook = {
  my_review: string | null;
  rating_overall: number | null;
  rating_recommend: number | null;
  rating_difficulty: number | null;
  reader_level: string | null;
  favorite_quotes?: string | null;
  memorable_words?: string | null;
};

type RatingTabProps = {
  row: UserBook;

  // kept for compatibility with your current parent usage
  isEditingThisTab?: boolean;

  onSave: () => void | Promise<void>;
  saving?: boolean;

  myReview: string;
  setMyReview: (value: string) => void;

  ratingOverall: string;
  setRatingOverall: (value: string) => void;

  ratingRecommend: string;
  setRatingRecommend: (value: string) => void;

  ratingDifficulty: string;
  setRatingDifficulty: (value: string) => void;

  readerLevel: string;
  setReaderLevel: (value: string) => void;

  favoriteQuotes: string;
  setFavoriteQuotes: (value: string) => void;

  memorableWords: string;
  setMemorableWords: (value: string) => void;

  LEVEL_OPTIONS: readonly string[];

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
  saving = false,
  myReview,
  setMyReview,
  ratingOverall,
  setRatingOverall,
  ratingRecommend,
  setRatingRecommend,
  ratingDifficulty,
  setRatingDifficulty,
  readerLevel,
  setReaderLevel,
  favoriteQuotes,
  setFavoriteQuotes,
  memorableWords,
  setMemorableWords,
  LEVEL_OPTIONS,
  StarRatingField,
  DifficultyField,
}: RatingTabProps) {
  const [editingReview, setEditingReview] = useState(false);
  const [editingRatings, setEditingRatings] = useState(false);
  const [editingContext, setEditingContext] = useState(false);
  const [editingMemory, setEditingMemory] = useState(false);

  function cancelReview() {
    setMyReview(row.my_review ?? "");
    setEditingReview(false);
  }

  function cancelRatings() {
    setRatingOverall(row.rating_overall != null ? String(row.rating_overall) : "");
    setRatingRecommend(row.rating_recommend != null ? String(row.rating_recommend) : "");
    setEditingRatings(false);
  }

  function cancelContext() {
    setReaderLevel(row.reader_level ?? "");
    setRatingDifficulty(
      row.rating_difficulty != null ? String(row.rating_difficulty) : ""
    );
    setEditingContext(false);
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

  async function saveContext() {
    await onSave();
    setEditingContext(false);
  }

  async function saveMemory() {
    await onSave();
    setEditingMemory(false);
  }

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
          title="Book Ratings"
          editing={editingRatings}
          onEdit={() => setEditingRatings(true)}
          onCancel={cancelRatings}
          onSave={saveRatings}
          saving={saving}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

          <StarRatingField
            label="Language Learning Potential"
            value={row.rating_recommend}
            editing={editingRatings}
            inputValue={ratingRecommend}
            setInputValue={setRatingRecommend}
            descriptions={{
              5: "This is a learner’s dream come true!",
              4: "Has a lot of good material in there.",
              3: "You can learn some stuff, but nothing special.",
              2: "Not so much useful language material.",
              1: "I didn’t get anything out of it.",
            }}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <CardHeader
          title="Reading Context"
          editing={editingContext}
          onEdit={() => setEditingContext(true)}
          onCancel={cancelContext}
          onSave={saveContext}
          saving={saving}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded border bg-white p-3 text-sm">
            <div className="text-stone-600">My Level at Time of Reading</div>
            {!editingContext ? (
              <div className="mt-1 font-medium">{row.reader_level || "—"}</div>
            ) : (
              <select
                value={readerLevel}
                onChange={(e) => setReaderLevel(e.target.value)}
                className="mt-1 w-full rounded border bg-white px-2 py-1 text-sm"
              >
                <option value="">—</option>
                {LEVEL_OPTIONS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            )}
          </div>

          <DifficultyField
            value={row.rating_difficulty}
            editing={editingContext}
            inputValue={ratingDifficulty}
            setInputValue={setRatingDifficulty}
          />
        </div>
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
                {row.favorite_quotes?.trim() ? row.favorite_quotes : "—"}
              </div>
            </div>

            <div className="rounded border bg-white p-3 text-sm">
              <div className="text-stone-600">Memorable Words</div>
              <div className="mt-1 min-h-[100px] whitespace-pre-wrap text-stone-700">
                {row.memorable_words?.trim() ? row.memorable_words : "—"}
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