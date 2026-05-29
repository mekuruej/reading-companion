// Loading screen for the book vocabulary list.
// page.tsx still decides when loading is true; this component only renders the visual state.
export default function BookVocabLoadingState() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Loading words…</p>
    </main>
  );
}