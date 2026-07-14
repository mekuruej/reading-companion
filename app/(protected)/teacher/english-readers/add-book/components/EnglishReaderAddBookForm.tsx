type EnglishReaderAddBookFormProps = {
  title: string;
  author: string;
  isbn13: string;
  editionFormat: string;
  editionNote: string;
  externalUrl: string;
  recommendedLevel: string;
  saving: boolean;
  onTitleChange: (value: string) => void;
  onAuthorChange: (value: string) => void;
  onIsbn13Change: (value: string) => void;
  onEditionFormatChange: (value: string) => void;
  onEditionNoteChange: (value: string) => void;
  onExternalUrlChange: (value: string) => void;
  onRecommendedLevelChange: (value: string) => void;
  onSubmit: () => void;
};

const ENGLISH_EDITION_FORMAT_OPTIONS = [
  { value: "paperback", label: "Paperback" },
  { value: "hardcover", label: "Hardcover" },
  { value: "ebook", label: "Ebook" },
  { value: "other", label: "Other" },
];

export default function EnglishReaderAddBookForm({
  title,
  author,
  isbn13,
  editionFormat,
  editionNote,
  externalUrl,
  recommendedLevel,
  saving,
  onTitleChange,
  onAuthorChange,
  onIsbn13Change,
  onEditionFormatChange,
  onEditionNoteChange,
  onExternalUrlChange,
  onRecommendedLevelChange,
  onSubmit,
}: EnglishReaderAddBookFormProps) {
  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
          Manual entry
        </p>
        <h2 className="mt-2 text-xl font-black text-stone-900">
          Book details
        </h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          This creates an English book for your teacher prep area without changing the Japanese book add flow.
        </p>
      </div>

      <form
        className="mt-5 space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div>
          <label className="mb-1 block text-sm font-semibold text-stone-800">
            Title *
          </label>
          <input
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="Book title"
            className="w-full rounded-xl border border-stone-300 px-4 py-3 text-base text-stone-900 outline-none transition focus:border-stone-500"
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-stone-800">
              Author <span className="font-normal text-stone-500">(optional)</span>
            </label>
            <input
              value={author}
              onChange={(event) => onAuthorChange(event.target.value)}
              placeholder="Author name"
              className="w-full rounded-xl border border-stone-300 px-4 py-3 text-base text-stone-900 outline-none transition focus:border-stone-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-stone-800">
              ISBN-13 <span className="font-normal text-stone-500">(optional)</span>
            </label>
            <input
              value={isbn13}
              onChange={(event) => onIsbn13Change(event.target.value)}
              placeholder="Hyphens are okay"
              className="w-full rounded-xl border border-stone-300 px-4 py-3 text-base text-stone-900 outline-none transition focus:border-stone-500"
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-stone-800">
              Edition format <span className="font-normal text-stone-500">(optional)</span>
            </label>
            <select
              value={editionFormat}
              onChange={(event) => onEditionFormatChange(event.target.value)}
              className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base text-stone-900 outline-none transition focus:border-stone-500"
            >
              <option value="">Choose a format</option>
              {ENGLISH_EDITION_FORMAT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-stone-800">
              Edition note <span className="font-normal text-stone-500">(optional)</span>
            </label>
            <input
              value={editionNote}
              onChange={(event) => onEditionNoteChange(event.target.value)}
              placeholder="US edition, UK edition, revised edition..."
              className="w-full rounded-xl border border-stone-300 px-4 py-3 text-base text-stone-900 outline-none transition focus:border-stone-500"
            />
            <p className="mt-1 text-xs leading-5 text-stone-500">
              Optional. Use for details that help identify this specific edition.
            </p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-stone-800">
              External URL <span className="font-normal text-stone-500">(optional)</span>
            </label>
            <input
              value={externalUrl}
              onChange={(event) => onExternalUrlChange(event.target.value)}
              placeholder="https://..."
              className="w-full rounded-xl border border-stone-300 px-4 py-3 text-base text-stone-900 outline-none transition focus:border-stone-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-stone-800">
              Recommended level <span className="font-normal text-stone-500">(optional)</span>
            </label>
            <input
              value={recommendedLevel}
              onChange={(event) => onRecommendedLevelChange(event.target.value)}
              placeholder="Example: A2, B1, intermediate"
              className="w-full rounded-xl border border-stone-300 px-4 py-3 text-base text-stone-900 outline-none transition focus:border-stone-500"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-stone-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold leading-5 text-stone-500">
            ISBN can be blank for physical books, graded readers, web readers, or platform books without ISBN metadata.
          </p>

          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="rounded-2xl bg-stone-900 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Create English Book"}
          </button>
        </div>
      </form>
    </section>
  );
}
