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
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6">
      <p className="text-red-700">{errorMsg ?? "Word not found."}</p>
      <button onClick={onBack} className="rounded bg-gray-200 px-4 py-2">
        ← Back
      </button>
    </main>
  );
}