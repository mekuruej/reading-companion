type TeacherReadingFitMessageProps = {
  message: string;
};

export function TeacherReadingFitMessage({
  message,
}: TeacherReadingFitMessageProps) {
  if (!message) return null;

  return (
    <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}