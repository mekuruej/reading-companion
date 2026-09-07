type FindBooksResultsStateProps = {
  type: "loading" | "empty";
};

export default function FindBooksResultsState({
  type,
}: FindBooksResultsStateProps) {
  if (type === "loading") {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
        Loading rated books...
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm leading-6 text-slate-500 shadow-sm">
      <p>No shared book ratings match these filters yet.</p>
      <p className="mt-3 font-semibold text-slate-700">
        This resource is still growing!
      </p>
      <p className="mt-1">
        Not many Reading Reflections have been written yet. Read a Japanese book
        and add your reflection to help other learners find the right book for
        them.
      </p>
    </div>
  );
}
