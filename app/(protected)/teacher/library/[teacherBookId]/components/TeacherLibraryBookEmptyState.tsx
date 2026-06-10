type TeacherLibraryBookEmptyStateProps = {
  message: string;
};

export default function TeacherLibraryBookEmptyState({
  message,
}: TeacherLibraryBookEmptyStateProps) {
  return (
    <div className="mt-3 rounded-3xl border border-stone-200 bg-white p-6 text-sm text-stone-500">
      {message}
    </div>
  );
}