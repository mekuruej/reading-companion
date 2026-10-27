type WordSkyLoadingStateProps = {
  message?: string;
};

export default function WordSkyLoadingState({
  message = "Loading Word Sky...",
}: WordSkyLoadingStateProps) {
  return (
    <main style={{ backgroundImage: "var(--appearance-page-image)" }} className="flex min-h-screen items-center justify-center bg-[var(--appearance-page)] p-6">
      <p className="text-lg text-[var(--appearance-muted-text)]">{message}</p>
    </main>
  );
}