type LibraryReviewLoadingStateProps = {
  message?: string;
};

export default function LibraryReviewLoadingState({
  message = "Loading Library Review...",
}: LibraryReviewLoadingStateProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="max-w-sm text-center">
        <p className="text-lg font-semibold text-gray-600">{message}</p>
        <p className="mt-2 text-sm text-gray-500">
          This may take some time if you have a lot of saved words.
        </p>
      </div>
    </main>
  );
}
