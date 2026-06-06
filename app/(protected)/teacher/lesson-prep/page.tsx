// Teacher Lesson Prep
//

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type PrepCard = {
  title: string;
  href?: string;
  eyebrow: string;
  description: string;
  disabled?: boolean;
};

const prepCards: PrepCard[] = [
  {
    title: "Teaching Books",
    href: "/teacher/library",
    eyebrow: "Book materials",
    description: "Manage books, notes, vocabulary, and reusable reading support for teaching.",
  },
  {
    title: "Assign / Prep for Students",
    href: "/teacher/assign",
    eyebrow: "Assignments",
    description: "Assign prepared materials and book work to students.",
  },
  {
    title: "Trial Prep",
    href: "/teacher/trials",
    eyebrow: "Trial lessons",
    description: "Prepare trial reading materials, key words, notes, and reusable trial sets.",
  },
  {
    title: "Clubs",
    href: "/teacher/clubs",
    eyebrow: "Groups",
    description: "Plan club groups, weekly readings, and shared support materials.",
  },
  {
    title: "Lesson Follow-Along Prep",
    eyebrow: "Future workflow",
    description:
      "Placeholder for lesson-specific follow-along notes, prep checklists, and reusable teaching sequences.",
    disabled: true,
  },
];

function isSuperTeacherFlag(value: unknown) {
  return value === true || value === "true";
}

function PrepCardGrid({ cards }: { cards: PrepCard[] }) {
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
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
              {card.eyebrow}
            </p>
            <h2 className="mt-3 text-xl font-black text-stone-900">{card.title}</h2>
            <p className="mt-3 text-sm leading-6 text-stone-600">{card.description}</p>
            <p className="mt-4 text-sm font-semibold text-stone-900">
              {card.disabled ? "Placeholder" : "Open →"}
            </p>
          </div>
        );

        if (!card.href || card.disabled) {
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

export default function TeacherLessonPrepPage() {
  const [accessChecked, setAccessChecked] = useState(false);
  const [canAccess, setCanAccess] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function checkTeacherAccess() {
      setAccessChecked(false);
      setCanAccess(false);
      setMessage("");

      const { data: auth, error: authError } = await supabase.auth.getUser();
      const user = auth?.user;

      if (cancelled) return;

      if (authError || !user) {
        setMessage("Please sign in to use Lesson Prep.");
        setAccessChecked(true);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, is_super_teacher")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (profileError) {
        setMessage(profileError.message ?? "Could not load teacher profile.");
        setAccessChecked(true);
        return;
      }

      const isTeacher =
        profile?.role === "teacher" ||
        profile?.role === "super_teacher" ||
        isSuperTeacherFlag(profile?.is_super_teacher);

      setCanAccess(isTeacher);
      setMessage(isTeacher ? "" : "Teacher access is required.");
      setAccessChecked(true);
    }

    void checkTeacherAccess();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!accessChecked) {
    return (
      <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm text-gray-500">Loading teacher access...</p>
        </div>
      </main>
    );
  }

  if (!canAccess) {
    return (
      <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
            Teacher access
          </p>
          <h1 className="mt-2 text-2xl font-black text-stone-900">Lesson Prep</h1>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            {message || "Teacher access is required."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <Link href="/teacher" className="text-sm font-semibold text-stone-500 hover:text-stone-900">
            ← Teacher Hub
          </Link>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
            Teacher workspace
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-900">
            Lesson Prep
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
            Prepare teaching books, student assignments, trial materials, clubs, and lesson-ready materials.
          </p>
        </section>

        <section className="mt-6">
          <PrepCardGrid cards={prepCards} />
        </section>
      </div>
    </main>
  );
}
