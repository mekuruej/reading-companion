type TeacherFollowAlongLoadingStateProps = {
  message?: string;
};

export function TeacherFollowAlongLoadingState({
  message = "Loading follow-along support...",
}: TeacherFollowAlongLoadingStateProps) {
  return (
    <main className="min-h-screen bg-stone-50 p-4 sm:p-6">
      <div className="mx-auto max-w-4xl rounded-3xl border border-stone-200 bg-white p-6 text-sm text-stone-500 shadow-sm">
        {message}
      </div>
    </main>
  );
}