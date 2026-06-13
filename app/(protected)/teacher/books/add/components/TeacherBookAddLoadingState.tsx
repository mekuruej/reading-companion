type TeacherBookAddLoadingStateProps = {
  message?: string;
};

export function TeacherBookAddLoadingState({
  message = "Loading...",
}: TeacherBookAddLoadingStateProps) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <p className="text-sm text-stone-600">{message}</p>
    </main>
  );
}
