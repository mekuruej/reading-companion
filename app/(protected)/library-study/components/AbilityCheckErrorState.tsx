type AbilityCheckErrorStateProps = {
  message: string;
  onBackToLibrary: () => void;
};

export default function AbilityCheckErrorState({
  message,
  onBackToLibrary,
}: AbilityCheckErrorStateProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-100 p-6">
      <p className="text-red-700">{message}</p>

      <button
        type="button"
        onClick={onBackToLibrary}
        className="rounded bg-gray-200 px-4 py-2"
      >
        Back to Library
      </button>
    </main>
  );
}