type KanjiStudyLoadingStateProps = {
  message?: string;
};

export default function KanjiStudyLoadingState({
  message = "Loading Kanji Study...",
}: KanjiStudyLoadingStateProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <p className="text-lg text-gray-500">{message}</p>
    </main>
  );
}