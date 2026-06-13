type TeacherFollowAlongAccessStateProps = {
  message: string;
};

export function TeacherFollowAlongAccessState({
  message,
}: TeacherFollowAlongAccessStateProps) {
  return (
    <main className="min-h-screen bg-stone-50 p-4 sm:p-6">
      <div className="mx-auto max-w-4xl rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
        {message || "Teacher access is required."}
      </div>
    </main>
  );
}