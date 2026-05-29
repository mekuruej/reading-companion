type ReadAlongLoadingStateProps = {
  message?: string;
};

// Loading shell for the Read Along page.
// page.tsx still decides whether the page is loading or checking access;
// this component only renders the visual loading state.
export default function ReadAlongLoadingState({
  message = "Loading Read Along…",
}: ReadAlongLoadingStateProps) {
  return (
    <main className="min-h-screen bg-stone-50 p-6">
      <div className="mx-auto max-w-4xl rounded-3xl border border-stone-200 bg-white p-6 text-center text-stone-500">
        {message}
      </div>
    </main>
  );
}