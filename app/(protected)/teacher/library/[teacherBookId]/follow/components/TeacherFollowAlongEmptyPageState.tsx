type TeacherFollowAlongEmptyPageStateProps = {
  message?: string;
};

export function TeacherFollowAlongEmptyPageState({
  message = "No Follow-Along-ready words or support items yet. Add meanings to saved words to use them here.",
}: TeacherFollowAlongEmptyPageStateProps) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6 text-center text-sm text-stone-500">
      {message}
    </div>
  );
}
