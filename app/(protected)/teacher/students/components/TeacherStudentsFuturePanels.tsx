const FUTURE_PANELS = [
  {
    title: "Lesson Notes",
    description:
      "Later, each student can have dated lesson notes, things you reviewed, what they struggled with, and next steps.",
  },
  {
    title: "Assigned Books",
    description:
      "Track books assigned from trial prep, teacher prep, or book club prep.",
  },
  {
    title: "Student Stats",
    description:
      "Eventually show library stats, reading activity, saved words, and study patterns for each learner.",
  },
];

export default function TeacherStudentsFuturePanels() {
  return (
    <section className="mt-10 grid gap-4 md:grid-cols-3">
      {FUTURE_PANELS.map((panel) => (
        <div
          key={panel.title}
          className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-base font-black text-stone-900">
            {panel.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            {panel.description}
          </p>
        </div>
      ))}
    </section>
  );
}