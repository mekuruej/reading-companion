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
      No shared book ratings match these filters yet.
    </div>
  );
}