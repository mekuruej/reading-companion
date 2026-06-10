type TeacherStudentsSummary = {
  currentStudents: number;
  futureStudents: number;
  pastStudents: number;
  assignedPrepBooks: number;
  archivedStudents: number;
};

type TeacherStudentsSummaryCardsProps = {
  summary: TeacherStudentsSummary;
};

export default function TeacherStudentsSummaryCards({
  summary,
}: TeacherStudentsSummaryCardsProps) {
  return (
    <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
        <p className="text-xs text-emerald-700">Current students</p>
        <p className="mt-1 text-2xl font-black text-stone-900">
          {summary.currentStudents}
        </p>
        <p className="mt-1 text-xs text-emerald-700">
          Active teacher relationships.
        </p>
      </div>

      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 shadow-sm">
        <p className="text-xs text-sky-700">Future students</p>
        <p className="mt-1 text-2xl font-black text-emerald-900">
          {summary.futureStudents}
        </p>
        <p className="mt-1 text-xs text-sky-700">
          Trials, prep, and upcoming learners.
        </p>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <p className="text-xs text-stone-500">Past students</p>
        <p className="mt-1 text-2xl font-black text-stone-900">
          {summary.pastStudents}
        </p>
        <p className="mt-1 text-xs text-stone-500">
          Expired or former active access.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
        <p className="text-xs text-amber-700">Assigned prep books</p>
        <p className="mt-1 text-2xl font-black text-amber-900">
          {summary.assignedPrepBooks}
        </p>
        <p className="mt-1 text-xs text-amber-700">Books assigned from prep.</p>
      </div>

      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
        <p className="text-xs text-rose-700">Archived students</p>
        <p className="mt-1 text-2xl font-black text-stone-900">
          {summary.archivedStudents}
        </p>
        <p className="mt-1 text-xs text-rose-700">
          Hidden from normal teacher queues.
        </p>
      </div>
    </section>
  );
}