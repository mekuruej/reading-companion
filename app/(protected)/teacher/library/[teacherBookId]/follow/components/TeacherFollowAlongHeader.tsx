type TeacherFollowAlongHeaderProps = {
  contextLabel?: string;
  contextDetail?: string;
};

export function TeacherFollowAlongHeader({
  contextLabel = "Teacher Prep",
  contextDetail = "No student selected",
}: TeacherFollowAlongHeaderProps) {
  return (
    <header>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">
        {contextLabel}
      </p>
      <h1 className="text-2xl font-semibold text-stone-900">
        Teacher Follow-Along
      </h1>
      <p className="mt-1 max-w-4xl text-sm leading-6 text-stone-600">
        Use your prepared words, phrases, grammar notes, sentence translations,
        and teaching notes as light support during a lesson.
      </p>
      <p className="mt-2 text-xs font-black uppercase tracking-[0.14em] text-stone-500">
        {contextDetail}
      </p>
    </header>
  );
}
