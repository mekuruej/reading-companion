type TeacherStudentsSummary = {
  currentStudents: number;
  pastStudents: number;
  totalUsers: number;
};

type TeacherStudentsSummaryCardsProps = {
  summary: TeacherStudentsSummary;
  showTotalUsers?: boolean;
};

export default function TeacherStudentsSummaryCards({
  summary,
  showTotalUsers = false,
}: TeacherStudentsSummaryCardsProps) {
  return (
    <section className={`mt-6 grid gap-2 sm:grid-cols-2 ${showTotalUsers ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 shadow-sm">
        <p className="text-xs font-semibold text-emerald-700">Current students</p>
        <p className="mt-1 text-xl font-black leading-none text-stone-900">
          {summary.currentStudents}
        </p>
      </div>

      <div className="rounded-2xl border border-violet-200 bg-violet-50 px-3 py-3 shadow-sm">
        <p className="text-xs font-semibold text-violet-500">Past students</p>
        <p className="mt-1 text-xl font-black leading-none text-stone-900">
          {summary.pastStudents}
        </p>
      </div>

      {showTotalUsers ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-3 shadow-sm">
          <p className="text-xs font-semibold text-blue-700">Total users</p>
          <p className="mt-1 text-xl font-black leading-none text-teal-950">
            {summary.totalUsers}
          </p>
        </div>
      ) : null}
    </section>
  );
}
