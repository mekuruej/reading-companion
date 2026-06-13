type TeacherBookAddAccessStateProps = {
  message: string;
};

export function TeacherBookAddAccessState({
  message,
}: TeacherBookAddAccessStateProps) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        {message}
      </p>
    </main>
  );
}