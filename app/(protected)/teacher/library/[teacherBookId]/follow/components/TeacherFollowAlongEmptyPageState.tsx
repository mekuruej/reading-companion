type TeacherFollowAlongEmptyPageStateProps = {
  message?: string;
};

export function TeacherFollowAlongEmptyPageState({
  message = "No teacher prep items for this page yet.",
}: TeacherFollowAlongEmptyPageStateProps) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6 text-center text-sm text-stone-500">
      {message}
    </div>
  );
}