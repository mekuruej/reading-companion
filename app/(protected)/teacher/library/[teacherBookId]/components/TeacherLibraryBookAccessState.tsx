type TeacherLibraryBookAccessStateProps = {
  message: string;
};

export default function TeacherLibraryBookAccessState({
  message,
}: TeacherLibraryBookAccessStateProps) {
  return (
    <section className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
      {message || "Teacher access is required."}
    </section>
  );
}