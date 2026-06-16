type AddWordSuperTeacherToolsProps = {
  saving: "cache" | "wordSky" | null;
  message: string;
  onSaveCacheOnly: () => void;
  onSaveAndApproveWordSky: () => void;
};

export default function AddWordSuperTeacherTools({
  saving,
  message,
  onSaveCacheOnly,
  onSaveAndApproveWordSky,
}: AddWordSuperTeacherToolsProps) {
  return (
    <section className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
      <div className="text-sm font-semibold text-amber-950">
        Super teacher tools
      </div>

      <p className="mt-1 text-xs leading-5 text-amber-800">
        These actions update global word data. They do not have to save the word
        to this book.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onSaveCacheOnly}
          disabled={saving != null}
          className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
        >
          {saving === "cache" ? "Saving..." : "Save to vocabulary cache only"}
        </button>

        <button
          type="button"
          onClick={onSaveAndApproveWordSky}
          disabled={saving != null}
          className="rounded-xl bg-amber-900 px-3 py-2 text-sm font-medium text-white hover:bg-amber-950 disabled:opacity-50"
        >
          {saving === "wordSky"
            ? "Approving..."
            : "Save to cache + approve for Word Sky"}
        </button>
      </div>

      {message ? (
        <p
          className={`mt-2 text-sm font-medium ${
            message.startsWith("❌") ? "text-red-700" : "text-emerald-700"
          }`}
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}