import AccessDeniedMessage from "@/components/AccessDeniedMessage";

type WordDetailErrorStateProps = {
  errorMsg: string | null;
  onBack: () => void;
};

export default function WordDetailErrorState({
  errorMsg,
  onBack,
}: WordDetailErrorStateProps) {
  if (errorMsg === "You do not have access to this word.") {
    return <AccessDeniedMessage message={errorMsg} />;
  }

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-xl flex-col justify-center">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex text-sm font-semibold text-stone-500 hover:text-stone-950"
        >
          ← Back
        </button>

        <p className="rounded-2xl border border-red-100 bg-white p-6 text-red-700 shadow-sm">
          {errorMsg ?? "Word not found."}
        </p>
      </div>
    </main>
  );
}
