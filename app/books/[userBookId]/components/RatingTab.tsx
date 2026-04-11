type UserBook = {
  my_review: string | null;
  rating_overall: number | null;
  rating_recommend: number | null;
  rating_difficulty: number | null;
  reader_level: string | null;
};

type RatingTabProps = {
  row: UserBook;
  isEditingThisTab: boolean;

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

  LEVEL_OPTIONS: readonly string[];

  StarRatingField: React.ComponentType<{
    label: string;
    value: number | null;
    editing: boolean;
    inputValue: string;
    setInputValue: (v: string) => void;
    descriptions: Record<number, string>;
  }>;

  DifficultyField: React.ComponentType<{
    value: number | null;
    editing: boolean;
    inputValue: string;
    setInputValue: (v: string) => void;
  }>;
};

export default function RatingTab({
  row,
  isEditingThisTab,
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
  LEVEL_OPTIONS,
  StarRatingField,
  DifficultyField,
}: RatingTabProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="mb-3 text-sm font-semibold text-stone-900">My Review</div>

        {!isEditingThisTab ? (
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
        <div className="mb-3 text-sm font-semibold text-stone-900">Book Ratings</div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StarRatingField
            label="Entertainment Rating"
            value={row.rating_overall}
            editing={isEditingThisTab}
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
            editing={isEditingThisTab}
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
        <div className="mb-3 text-sm font-semibold text-stone-900">Reading Context</div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded border bg-white p-3 text-sm">
            <div className="text-stone-600">My Level at Time of Reading</div>
            {!isEditingThisTab ? (
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
            editing={isEditingThisTab}
            inputValue={ratingDifficulty}
            setInputValue={setRatingDifficulty}
          />
        </div>
      </div>
    </div>
  );
}