// Teacher Hub
//

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type TeacherHubCard = {
  title: string;
  href: string;
  eyebrow: string;
  description: string;
};

const teacherHubCards: TeacherHubCard[] = [
  {
    title: "Lesson Prep",
    href: "/teacher/lesson-prep",
    eyebrow: "Prepare",
    description:
      "Prepare student lessons, trial prep, reusable materials, and teaching workflows.",
  },
  {
    title: "Needs Attention",
    href: "/teacher/needs-attention",
    eyebrow: "Review",
    description:
      "Review book requests, kanji reports, missing book info, and other cleanup queues.",
  },
  {
    title: "General Upkeep",
    href: "/teacher/general-upkeep",
    eyebrow: "Maintain",
    description:
      "Handle global word data, Word Sky candidates, cleanup, and admin-ish teacher tools.",
  },
];

function isSuperTeacherFlag(value: unknown) {
  return value === true || value === "true";
}

function TeacherHubCardGrid({ cards }: { cards: TeacherHubCard[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Link key={card.title} href={card.href}>
          <div className="h-full rounded-3xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
              {card.eyebrow}
            </p>

            <h2 className="mt-3 text-xl font-black text-stone-900">{card.title}</h2>

            <p className="mt-3 text-sm leading-6 text-stone-600">{card.description}</p>

            <p className="mt-4 text-sm font-semibold text-stone-900">Open →</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function TeacherHubPage() {
  const [isSuperTeacher, setIsSuperTeacher] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadTeacherRole() {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;

      if (!user || cancelled) return;

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role, is_super_teacher")
        .eq("id", user.id)
        .maybeSingle();

      if (error || cancelled) return;

      setIsSuperTeacher(
        profile?.role === "super_teacher" || isSuperTeacherFlag(profile?.is_super_teacher)
      );
    }

    void loadTeacherRole();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
          Teacher Portal
        </p>

        <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-900">
          Teacher Hub
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          Start with lesson prep, review what needs attention, or keep global teacher-side data tidy.
        </p>
      </section>

      <section className="mt-8">
        <TeacherHubCardGrid cards={teacherHubCards} />
      </section>

      <section className="mt-8">
        <div className="mb-3">
          <h2 className="text-lg font-black text-stone-900">Today</h2>
          <p className="mt-1 text-sm text-stone-500">
            Future alerts should answer two questions: what do my learners need, and what does the app need from me?
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
              Learner / Lesson Alerts
            </p>
            <h3 className="mt-2 text-xl font-black text-stone-900">
              What do I need to do for my learners?
            </h3>
            <p className="mt-2 text-sm leading-6 text-stone-700">
              After each lesson, remember to add new words, notes, or prep items while they are still fresh.
            </p>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              Later, this area can show linked-student work due or completed, upcoming lessons, student prep needs, and assignment follow-up.
            </p>
          </div>

          <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
              App / Upkeep Alerts
            </p>
            <h3 className="mt-2 text-xl font-black text-stone-900">
              What does the app or global data need from me?
            </h3>
            {isSuperTeacher ? (
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Pending book requests, missing book info, kanji reports, global word cleanup, Word Sky review, and app data cleanup can move here later.
              </p>
            ) : (
              <p className="mt-2 text-sm leading-6 text-stone-600">
                No app upkeep alerts are shown for your role right now. Learner and lesson follow-up will stay separate from global maintenance work.
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
