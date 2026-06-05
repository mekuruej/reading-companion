type StudyNeedsSignInStateProps = {
  message?: string;
};

export default function StudyNeedsSignInState({
  message = "You need to sign in to see your book flashcards.",
}: StudyNeedsSignInStateProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6">
      <p className="text-gray-700">{message}</p>
    </main>
  );
}