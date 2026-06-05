type LibraryReviewLoadingStateProps = {
  message?: string;
};

export default function LibraryReviewLoadingState({
  message = "Loading Library Review...",
}: LibraryReviewLoadingStateProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <p className="text-lg text-gray-500">{message}</p>
    </main>
  );
}