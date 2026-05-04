// Teacher Hub
//

import Link from "next/link";

type TeacherCard = {
  title: string;
  href: string;
  eyebrow: string;
  description: string;
  status: "Active" | "Planned" | "Later";
  disabled?: boolean;
};

const lessonPrepCards: TeacherCard[] = [
  {
    title: "My Students",
    href: "/teacher/assign",
    eyebrow: "Student setup",
    description:
      "View student setup tools, assign prepared books, and make sure each learner has the right reading support.",
    status: "Active",
  },
  {
    title: "Book Club Prep",
    href: "/teacher/clubs",
    eyebrow: "Groups",
    description:
      "Plan club groups, weekly readings, shared support words, and student-facing club materials.",
    status: "Planned",
  },
  {
    title: "Trial Prep",
    href: "/teacher/trials",
    eyebrow: "Trial lessons",
    description:
      "Prepare trial reading materials, key words, notes, and reusable trial sets by level.",
    status: "Planned",
  },
];

const workbenchCards: TeacherCard[] = [
  {
    title: "Kanji Enrichment Queue",
    href: "/teacher/kanji",
    eyebrow: "Needs attention",
    description:
      "Review vocabulary that needs kanji-reading enrichment, filter by book, and debug why completed items may still be appearing.",
    status: "Active",
  },
  {
    title: "Books Needing Attention",
    href: "/teacher/books",
    eyebrow: "Book prep",
    description:
      "See books with missing info, unfinished prep, enrichment gaps, or teacher notes that need review.",
    status: "Later",
    disabled: true,
  },
  {
    title: "Recent Activity",
    href: "/teacher/review",
    eyebrow: "Student activity",
    description:
      "Review recent reading sessions, study activity, vocabulary additions, and prep changes.",
    status: "Later",
    disabled: true,
  },
];

function TeacherCardGrid({ cards }: { cards: TeacherCard[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => {
        const cardContent = (
          <div
            className={`h-full rounded-3xl border p-5 shadow-sm transition ${
              card.disabled
                ? "border-stone-200 bg-stone-50 text-stone-500"
                : "border-stone-200 bg-white hover:-translate-y-0.5 hover:shadow-md"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                {card.eyebrow}
              </p>

              <span
                className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${
                  card.status === "Active"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-stone-200 bg-white text-stone-500"
                }`}
              >
                {card.status}
              </span>
            </div>

            <h2 className="mt-3 text-xl font-black text-stone-900">
              {card.title}
            </h2>

            <p className="mt-2 text-sm leading-6 text-stone-600">
              {card.description}
            </p>

            <p className="mt-4 text-sm font-semibold text-stone-900">
              {card.disabled ? "Coming later" : "Open →"}
            </p>
          </div>
        );

        if (card.disabled) {
          return <div key={card.title}>{cardContent}</div>;
        }

        return (
          <Link key={card.title} href={card.href}>
            {cardContent}
          </Link>
        );
      })}
    </div>
  );
}

export default function TeacherHubPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
          Teacher Portal
        </p>

        <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-900">
          Teacher Home
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          Manage student reading support, lesson prep, book club planning,
          kanji enrichment, and teacher-side workflows from one workspace.
        </p>
      </section>

      <section className="mt-8">
        <div className="mb-3">
          <h2 className="text-lg font-black text-stone-900">Lesson Prep</h2>
          <p className="mt-1 text-sm text-stone-500">
            Set up students, groups, and trial reading experiences.
          </p>
        </div>

        <TeacherCardGrid cards={lessonPrepCards} />
      </section>

      <section className="mt-10">
        <div className="mb-3">
          <h2 className="text-lg font-black text-stone-900">
            Teacher Workbench
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Review problems, enrichment gaps, and activity that needs your attention.
          </p>
        </div>

        <TeacherCardGrid cards={workbenchCards} />
      </section>
    </main>
  );
}