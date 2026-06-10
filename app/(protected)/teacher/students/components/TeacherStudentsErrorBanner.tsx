type TeacherStudentsErrorBannerProps = {
  message: string | null;
};

export default function TeacherStudentsErrorBanner({
  message,
}: TeacherStudentsErrorBannerProps) {
  if (!message) return null;

  return (
    <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {message}
    </section>
  );
}