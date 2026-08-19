export default function TeacherStudentsHeader() {
  return (
    <section className="rounded-3xl border border-stone-200 bg-white px-5 py-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-[minmax(12rem,auto)_minmax(0,1fr)] md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
            Teacher Workspace
          </p>

          <h1 className="mt-1 text-2xl font-black tracking-tight text-stone-900">
            My students
          </h1>
        </div>

        <p className="max-w-2xl text-sm leading-5 text-stone-600 md:justify-self-end">
          Choose a learner, open their library, check assigned books, and
          eventually keep lesson notes and student-specific reading stats in
          one place.
        </p>
      </div>
    </section>
  );
}
