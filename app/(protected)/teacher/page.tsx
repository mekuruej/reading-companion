// Teacher Hub
//

import Link from "next/link";

const teacherSections = [
  {
    title: "Assign Book",
    description: "Assign books to students and manage starting points.",
    href: "/teacher/assign",
  },
  {
    title: "Kanji Enrichment",
    description: "Work through kanji enrichment queues and prep tasks.",
    href: "/teacher/kanji",
  },
  {
    title: "Trial Prep",
    description: "Prepare trial readings, vocab, and support materials.",
    href: "/teacher/trials",
  },
  {
    title: "Book Club Prep",
    description: "Manage book clubs, weekly assignments, and prep flows.",
    href: "/teacher/clubs",
  },
];

export default function TeacherHubPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-stone-500">
          Teacher
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-stone-900">
          Teacher Hub
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          This is the teacher workspace for prep and management across the app.
          Book-specific notes can stay in the Book Hub teacher tab, while bigger
          workflows live here.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {teacherSections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md"
          >
            <div className="flex h-full flex-col">
              <h2 className="text-lg font-semibold text-stone-900 group-hover:text-stone-700">
                {section.title}
              </h2>
              <p className="mt-2 flex-1 text-sm leading-6 text-stone-600">
                {section.description}
              </p>
              <div className="mt-4 text-sm font-medium text-emerald-700">
                Open →
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}