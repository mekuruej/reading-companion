type StudyLoadingStateProps = {
  message?: string;
};

export default function StudyLoadingState({
  message = "Loading flashcards…",
}: StudyLoadingStateProps) {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-lg text-gray-500">{message}</p>
    </main>
  );
}