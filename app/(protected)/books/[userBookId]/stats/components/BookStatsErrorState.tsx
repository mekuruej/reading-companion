type BookStatsErrorStateProps = {
  message: string;
};

export default function BookStatsErrorState({
  message,
}: BookStatsErrorStateProps) {
  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-center text-red-700 shadow-sm">
          {message}
        </div>
      </div>
    </main>
  );
}