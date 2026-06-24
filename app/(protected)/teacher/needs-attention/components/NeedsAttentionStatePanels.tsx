type NeedsAttentionAccessPanelProps = {
  message: string;
};

export function NeedsAttentionLoadingPanel() {
  return (
    <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm text-gray-500">Loading teacher access...</p>
      </div>
    </main>
  );
}

export function NeedsAttentionAccessPanel({ message }: NeedsAttentionAccessPanelProps) {
  return (
    <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-3xl rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
          Teacher access
        </p>

        <h1 className="mt-2 text-2xl font-black text-stone-900">Needs Attention</h1>

        <p className="mt-3 text-sm leading-6 text-stone-600">
          {message || "Teacher access is required."}
        </p>
      </div>
    </main>
  );
}