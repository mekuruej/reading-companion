type WordDetailNeedsSignInStateProps = {
  onBackToBooks: () => void;
};

export default function WordDetailNeedsSignInState({
  onBackToBooks,
}: WordDetailNeedsSignInStateProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6">
      <p className="text-gray-700">You need to sign in to view this word.</p>
      <button
        onClick={onBackToBooks}
        className="rounded bg-gray-200 px-4 py-2"
      >
        Back to Books
      </button>
    </main>
  );
}