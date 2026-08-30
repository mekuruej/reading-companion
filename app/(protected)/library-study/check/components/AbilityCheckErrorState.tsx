type AbilityCheckErrorStateProps = {
  message: string;
  onBackToStudyHub: () => void;
};

export default function AbilityCheckErrorState({
  message,
  onBackToStudyHub,
}: AbilityCheckErrorStateProps) {
  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-xl flex-col justify-center">
        <button
          type="button"
          onClick={onBackToStudyHub}
          className="mb-4 inline-flex text-sm font-semibold text-slate-500 hover:text-slate-900"
        >
          ← Back to Study Hub
        </button>

        <p className="rounded-2xl border border-red-100 bg-white p-6 text-red-700 shadow-sm">
          {message}
        </p>
      </div>
    </main>
  );
}
