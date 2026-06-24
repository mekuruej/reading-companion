export function ReadingHabitsLoadingPanel() {
  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-sm text-slate-600">Loading reading habits…</div>
      </div>
    </main>
  );
}

export function ReadingHabitsErrorBanner({ message }: { message: string }) {
  if (!message) return null;

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
      {message}
    </div>
  );
}