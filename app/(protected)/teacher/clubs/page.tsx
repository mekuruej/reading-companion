// Teacher Book Club Prep
//

import Link from "next/link";

const clubCards = [
  {
    title: "N4 Gentle Reading Club",
    slug: "n4-gentle-reading",
    level: "N4-ish",
    status: "Planned",
    pace: "1 page / week",
    description:
      "A low-pressure group for learners who need image support, generous pacing, and confidence-building reading practice.",
    chips: ["Shared vocab", "Read together", "Confidence"],
  },
  {
    title: "N3 Mystery Club",
    slug: "n3-mystery-club",
    level: "N3-ish",
    status: "Planned",
    pace: "2–4 pages / week",
    description:
      "A story-driven group for learners ready to read more real Japanese with support for vocab, grammar, and discussion.",
    chips: ["Weekly sets", "Core words", "Discussion"],
  },
  {
    title: "N2 Novel Club",
    slug: "n2-novel-club",
    level: "N2-ish",
    status: "Later",
    pace: "3–6 pages / week",
    description:
      "A slower novel club for learners who want to build stamina, sentence parsing, kanji comfort, and deeper comprehension.",
    chips: ["Grammar notes", "Kanji readings", "Nuance"],
  },
  {
    title: "Advanced Reading Circle",
    slug: "advanced-reading-circle",
    level: "N1+",
    status: "Later",
    pace: "Flexible",
    description:
      "A discussion-focused group for advanced readers who want to talk through style, interpretation, and subtle language.",
    chips: ["Discussion", "Interpretation", "Style"],
  },
];

const workflowCards = [
  {
    title: "Weekly Reading Sets",
    description:
      "Break the book into weekly page ranges with goals, spoiler boundaries, and prep status.",
  },
  {
    title: "Core Vocabulary",
    description:
      "Prepare shared words that everyone should review before or after each meeting.",
  },
  {
    title: "Personal Vocabulary",
    description:
      "Track words individual members did not know and decide whether to promote them to the core list.",
  },
  {
    title: "Grammar Notes",
    description:
      "Collect sentence patterns, confusing grammar, parsing notes, and explanations by week.",
  },
  {
    title: "Kanji Readings",
    description:
      "Connect weekly reading sets to the Teacher Kanji Queue for prepped kanji-reading support.",
  },
  {
    title: "Discussion Prompts",
    description:
      "Prepare comprehension, opinion, prediction, and reflection questions for each meeting.",
  },
];

export default function TeacherClubsPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
              Teacher Prep
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-900">
              Book Club Prep
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
              Plan reading groups, weekly assignments, shared support words,
              grammar notes, kanji readings, and discussion prompts from one
              teacher-side workspace.
            </p>
          </div>

          <Link
            href="/teacher"
            className="rounded-2xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            ← Teacher Home
          </Link>
        </div>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-stone-500">Club shelf</p>
          <p className="mt-1 text-2xl font-black text-stone-900">4</p>
          <p className="mt-1 text-xs text-stone-500">
            Planned reading group types.
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-xs text-emerald-700">Main unit</p>
          <p className="mt-1 text-2xl font-black text-emerald-900">Weeks</p>
          <p className="mt-1 text-xs text-emerald-700">
            Prep support one reading set at a time.
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-xs text-amber-700">Prep focus</p>
          <p className="mt-1 text-2xl font-black text-amber-900">Support</p>
          <p className="mt-1 text-xs text-amber-700">
            Vocab, grammar, kanji, and discussion.
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-stone-500">Future view</p>
          <p className="mt-1 text-2xl font-black text-stone-900">Members</p>
          <p className="mt-1 text-xs text-stone-500">
            Track group needs and personal unknowns.
          </p>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-stone-900">
              Book Club Shelf
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              A place for planned, active, and future reading groups.
            </p>
          </div>

          <button
            type="button"
            disabled
            className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-semibold text-stone-400"
          >
            Create club later
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {clubCards.map((club) => (
            <Link
              key={club.slug}
              href={`/teacher/clubs/${club.slug}`}
              className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                  {club.level}
                </p>

                <span
                  className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${
                    club.status === "Planned"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-stone-200 bg-stone-50 text-stone-500"
                  }`}
                >
                  {club.status}
                </span>
              </div>

              <h3 className="mt-3 text-xl font-black text-stone-900">
                {club.title}
              </h3>

              <p className="mt-1 text-sm font-semibold text-stone-500">
                {club.pace}
              </p>

              <p className="mt-3 text-sm leading-6 text-stone-600">
                {club.description}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {club.chips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-600"
                  >
                    {chip}
                  </span>
                ))}
              </div>

              <p className="mt-4 text-sm font-semibold text-stone-900">
                Open club prep →
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-3">
          <h2 className="text-lg font-black text-stone-900">
            What each book club can hold
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Book clubs are built around weekly reading sets, not single trial
            sessions.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workflowCards.map((card) => (
            <div
              key={card.title}
              className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"
            >
              <h3 className="text-base font-black text-stone-900">
                {card.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}