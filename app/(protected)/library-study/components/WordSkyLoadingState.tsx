type WordSkyLoadingStateProps = {
  message?: string;
};

export default function WordSkyLoadingState({
  message = "Loading Word Sky...",
}: WordSkyLoadingStateProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-sky-50 p-6">
      <p className="text-lg text-sky-700">{message}</p>
    </main>
  );
}