// Teacher Book Club Weekly Set
//

import Link from "next/link";

function titleFromSlug(slug: string) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const coreWords = [
  {
    word: "不思議",
    reading: "ふしぎ",
    meaning: "mysterious / strange",
    page: "p. 1",
    tag: "Core",
  },
  {
    word: "手がかり",
    reading: "てがかり",
    meaning: "clue",
    page: "p. 2",
    tag: "Discussion",
  },
  {
    word: "見当がつく",
    reading: "けんとうがつく",
    meaning: "to have an idea / guess",
    page: "p. 3",
    tag: "Nice to know",
  },
];

const grammarNotes = [
  {
    point: "〜わけではない",
    level: "N3-ish",
    note: "Useful for explaining partial negation and soft correction.",
  },
  {
    point: "とでも言うべき",
    level: "N2-ish",
    note: "Good sentence-level nuance note for stronger readers.",
  },
  {
    point: "〜に違いない",
    level: "N3-ish",
    note: "Useful for inference and discussion about what the character believes.",
  },
];

const prompts = [
  "What do we know for sure by the end of this section?",
  "What are we still unsure about?",
  "Which sentence felt hardest to parse?",
  "Which word or phrase felt useful enough to remember?",
];

export default async function TeacherClubWeekPage({
  params,
}: {
  params: Promise<{ clubId: string; weekId: string }>;
}) {
  const { clubId, weekId } = await params;
  const clubTitle = titleFromSlug(clubId);
  const weekTitle = titleFromSlug(weekId);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
              Weekly Reading Set
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-900">
              {clubTitle}: {weekTitle}
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
              Prep the weekly reading assignment, core vocabulary, grammar notes,
              kanji readings, personal unknowns, and discussion prompts.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/teacher/clubs/${clubId}`}
              className="rounded-2xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
            >
              ← Club Prep
            </Link>

            <Link
              href="/teacher/clubs"
              className="rounded-2xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
            >
              All Clubs
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-stone-500">Status</p>
          <p className="mt-1 text-2xl font-black text-stone-900">Draft</p>
          <p className="mt-1 text-xs text-stone-500">
            Not released to students.
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-xs text-emerald-700">Core vocab</p>
          <p className="mt-1 text-2xl font-black text-emerald-900">20</p>
          <p className="mt-1 text-xs text-emerald-700">
            Shared support words.
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-xs text-amber-700">Grammar notes</p>
          <p className="mt-1 text-2xl font-black text-amber-900">4</p>
          <p className="mt-1 text-xs text-amber-700">
            Sentence and nuance support.
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-stone-500">Discussion</p>
          <p className="mt-1 text-2xl font-black text-stone-900">3–5</p>
          <p className="mt-1 text-xs text-stone-500">
            Questions for the meeting.
          </p>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-stone-900">
          Reading Assignment
        </h2>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
              Page range
            </p>
            <p className="mt-2 text-sm text-stone-700">
              Add pages later, for example pp. 1–4.
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
              Spoiler boundary
            </p>
            <p className="mt-2 text-sm text-stone-700">
              Tell students where to stop before discussion.
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
              Reading goal
            </p>
            <p className="mt-2 text-sm text-stone-700">
              Understand the scene, notice key words, and bring questions.
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
              Expected difficulty
            </p>
            <p className="mt-2 text-sm text-stone-700">
              Mark this later as gentle, moderate, challenging, or stretch.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-stone-900">
                Core Vocabulary
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                Shared words everyone should see.
              </p>
            </div>

            <button
              type="button"
              disabled
              className="rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-400"
            >
              Add later
            </button>
          </div>

          <div className="space-y-2">
            {coreWords.map((word) => (
              <div
                key={word.word}
                className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xl font-semibold text-stone-900">
                      {word.word}
                    </p>
                    <p className="mt-1 text-sm text-stone-500">
                      {word.reading} ・ {word.meaning}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-stone-200 bg-white px-2 py-1 text-xs font-semibold text-stone-500">
                      {word.page}
                    </span>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                      {word.tag}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-stone-900">
            Personal Unknowns
          </h2>

          <p className="mt-2 text-sm leading-6 text-stone-600">
            Later, this can show words individual members did not know. You can
            promote repeated unknowns into the core vocabulary list.
          </p>

          <div className="mt-4 rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-5 text-center">
            <p className="text-sm font-semibold text-stone-700">
              No personal unknowns yet.
            </p>
            <p className="mt-2 text-sm text-stone-500">
              Future member data will appear here.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-stone-900">
            Grammar / Sentence Notes
          </h2>

          <div className="mt-4 space-y-2">
            {grammarNotes.map((note) => (
              <div
                key={note.point}
                className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-base font-black text-stone-900">
                    {note.point}
                  </p>
                  <span className="rounded-full border border-stone-200 bg-white px-2 py-1 text-xs font-semibold text-stone-500">
                    {note.level}
                  </span>
                </div>

                <p className="mt-2 text-sm leading-6 text-stone-600">
                  {note.note}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-stone-900">
            Discussion Prompts
          </h2>

          <div className="mt-4 space-y-2">
            {prompts.map((prompt, index) => (
              <div
                key={prompt}
                className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                  Question {index + 1}
                </p>
                <p className="mt-2 text-sm leading-6 text-stone-700">
                  {prompt}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-stone-900">
            Kanji Readings
          </h2>

          <p className="mt-2 text-sm leading-6 text-stone-600">
            Weekly kanji-reading work should connect to the global Teacher Kanji
            Queue instead of creating another editor here.
          </p>

          <Link
            href="/teacher/kanji"
            className="mt-4 inline-flex rounded-2xl border border-stone-900 bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
          >
            Open Kanji Queue →
          </Link>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-stone-900">
            Release Controls
          </h2>

          <p className="mt-2 text-sm leading-6 text-stone-600">
            Later, each weekly set can move from draft to ready to released.
            Students should only see the weeks you release.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {["Draft", "Ready", "Released", "Archived"].map((status) => (
              <span
                key={status}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  status === "Draft"
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-stone-200 bg-stone-50 text-stone-500"
                }`}
              >
                {status}
              </span>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}