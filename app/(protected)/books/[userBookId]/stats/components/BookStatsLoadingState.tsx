type BookStatsLoadingStateProps = {
  message?: string;
};

export default function BookStatsLoadingState({
  message = "Loading book stats...",
}: BookStatsLoadingStateProps) {
  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-3xl border border-stone-200 bg-white p-6 text-center text-stone-500 shadow-sm">
          {message}
        </div>
      </div>
    </main>
  );
}