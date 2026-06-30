// Teacher Site Upkeep
//

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type UpkeepCard = {
  title: string;
  href?: string;
  eyebrow: string;
  description: string;
  disabled?: boolean;
};

const baseUpkeepCards: UpkeepCard[] = [
  {
    title: "Global Book Entry",
    href: "/teacher/books/add?from=site-upkeep",
    eyebrow: "Books",
    description: "Add or edit global book records, including books that do not come from ISBN lookup.",
  },
  {
    title: "Global Vocabulary Entry",
    href: "/teacher/global-words?from=site-upkeep",
    eyebrow: "Vocabulary",
    description: "Create global vocabulary, people, places, cultural references, and support entries.",
  },
  {
    title: "Fast-pass Kanji Reading",
    href: "/teacher/kanji/fast-pass?from=site-upkeep",
    eyebrow: "Kanji",
    description: "Find an existing global vocabulary word and fill its kanji reading map.",
  },
  {
    title: "Radical Upkeep",
    href: "/teacher/kanji/radicals?from=site-upkeep",
    eyebrow: "Kanji",
    description: "Add main radicals, other visible components, and stroke counts for kanji study data.",
  },
  {
    title: "Testing Tools",
    href: "/teacher/testing?from=site-upkeep",
    eyebrow: "Test lab",
    description: "Use internal teacher-side testing tools for access checks and tricky app behavior.",
  },
];

function isSuperTeacherFlag(value: unknown) {
  return value === true || value === "true";
}

function UpkeepCardGrid({ cards }: { cards: UpkeepCard[] }) {
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

export default function TeacherGeneralUpkeepPage() {
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
        setMessage("Please sign in to use Site Upkeep.");
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
          <h1 className="mt-2 text-2xl font-black text-stone-900">Site Upkeep</h1>
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
            Maintenance workspace
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-900">
            Site Upkeep
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
            Keep global entry tools and internal testing pages in one place. Cleanup queues now live in Needs Attention.
          </p>
        </section>

        <section className="mt-6">
          <UpkeepCardGrid cards={baseUpkeepCards} />
        </section>
      </div>
    </main>
  );
}
