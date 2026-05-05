// Teacher Book Club Detail
//

import Link from "next/link";

function titleFromSlug(slug: string) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const weekCards = [
  {
    weekId: "week-1",
    title: "Week 1",
    range: "Opening pages",
    status: "Draft",
    focus: "Set the scene, introduce the main characters, and establish reading rhythm.",
    stats: ["Core vocab: 20", "Grammar notes: 4", "Discussion: 3"],
  },
  {
    weekId: "week-2",
    title: "Week 2",
    range: "First conflict / mystery clue",
    status: "Draft",
    focus: "Support comprehension while keeping the group inside the spoiler boundary.",
    stats: ["Core vocab: 18", "Grammar notes: 5", "Kanji readings: 8"],
  },
  {
    weekId: "week-3",
    title: "Week 3",
    range: "Middle section",
    status: "Planned",
    focus: "Track confusing sentences, unknown words, and discussion questions.",
    stats: ["Core vocab: —", "Grammar notes: —", "Discussion: —"],
  },
  {
    weekId: "week-4",
    title: "Week 4",
    range: "Later section",
    status: "Planned",
    focus: "Build toward discussion, prediction, and deeper understanding.",
    stats: ["Core vocab: —", "Grammar notes: —", "Discussion: —"],
  },
];

const memberPlaceholders = [
  {
    name: "Learner A",
    level: "N4/N3 bridge",
    note: "Needs kanji support and confidence reading aloud.",
  },
  {
    name: "Learner B",
    level: "N3-ish",
    note: "Good comprehension, but may need grammar parsing support.",
  },
  {
    name: "Learner C",
    level: "N3/N2 bridge",
    note: "May need more nuance and discussion prompts.",
  },
];

export default async function TeacherClubDetailPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  const clubTitle = titleFromSlug(clubId);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
              Book Club Prep
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-900">
              {clubTitle}
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
              Plan the club structure, weekly reading sets, member support,
              vocabulary, grammar notes, kanji readings, and discussion flow.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/teacher/clubs"
              className="rounded-2xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
            >
              ← All Clubs
            </Link>

            <Link
              href="/teacher"
              className="rounded-2xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
            >
              Teacher Home
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-stone-500">Status</p>
          <p className="mt-1 text-2xl font-black text-stone-900">Draft</p>
          <p className="mt-1 text-xs text-stone-500">
            Not student-facing yet.
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-xs text-emerald-700">Weekly sets</p>
          <p className="mt-1 text-2xl font-black text-emerald-900">4</p>
          <p className="mt-1 text-xs text-emerald-700">
            Drafted placeholder weeks.
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-xs text-amber-700">Member cap</p>
          <p className="mt-1 text-2xl font-black text-amber-900">4–6</p>
          <p className="mt-1 text-xs text-amber-700">
            Small enough for discussion.
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-stone-500">Pace</p>
          <p className="mt-1 text-2xl font-black text-stone-900">Weekly</p>
          <p className="mt-1 text-xs text-stone-500">
            Reading plus discussion.
          </p>
        </div>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-stone-900">Club Overview</h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                Target level
              </p>
              <p className="mt-2 text-sm text-stone-700">
                Set this later: N4, N3, N2, or advanced.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                Reading expectation
              </p>
              <p className="mt-2 text-sm text-stone-700">
                Read assigned pages before class, review support, bring questions.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                Club goal
              </p>
              <p className="mt-2 text-sm text-stone-700">
                Build reading confidence through shared support and discussion.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                Teacher notes
              </p>
              <p className="mt-2 text-sm text-stone-700">
                Add notes later about pacing, difficulty, and learner fit.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-stone-900">Members</h2>

          <div className="mt-4 space-y-3">
            {memberPlaceholders.map((member) => (
              <div
                key={member.name}
                className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-stone-900">
                      {member.name}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-stone-500">
                      {member.level}
                    </p>
                  </div>

                  <span className="rounded-full border border-stone-200 bg-white px-2 py-1 text-[11px] font-semibold text-stone-500">
                    Placeholder
                  </span>
                </div>

                <p className="mt-2 text-sm leading-6 text-stone-600">
                  {member.note}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-3">
          <h2 className="text-lg font-black text-stone-900">
            Weekly Reading Sets
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Each week can hold page ranges, core vocabulary, grammar notes,
            kanji readings, and discussion prompts.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {weekCards.map((week) => (
            <Link
              key={week.weekId}
              href={`/teacher/clubs/${clubId}/weeks/${week.weekId}`}
              className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                  {week.range}
                </p>

                <span
                  className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${
                    week.status === "Draft"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-stone-200 bg-stone-50 text-stone-500"
                  }`}
                >
                  {week.status}
                </span>
              </div>

              <h3 className="mt-3 text-xl font-black text-stone-900">
                {week.title}
              </h3>

              <p className="mt-3 text-sm leading-6 text-stone-600">
                {week.focus}
              </p>

              <div className="mt-4 space-y-1">
                {week.stats.map((stat) => (
                  <p key={stat} className="text-xs font-medium text-stone-500">
                    {stat}
                  </p>
                ))}
              </div>

              <p className="mt-4 text-sm font-semibold text-stone-900">
                Open weekly prep →
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}