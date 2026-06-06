// Teacher Needs Attention
//

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type AttentionCard = {
  title: string;
  href?: string;
  eyebrow: string;
  description: string;
  disabled?: boolean;
};

const attentionCards: AttentionCard[] = [
  {
    title: "Book Requests / Book Review",
    href: "/teacher/books",
    eyebrow: "Books",
    description: "Review pending book requests, book flags, and global books missing core information.",
  },
  {
    title: "Missing Book Info",
    href: "/teacher/books",
    eyebrow: "Book cleanup",
    description: "Find books that need covers, authors, reading metadata, ISBN cleanup, or other global book details.",
  },
  {
    title: "Kanji Reports / Errors",
    href: "/teacher/kanji",
    eyebrow: "Kanji",
    description: "Review kanji reports, flagged kanji readings, and enrichment queues.",
  },
  {
    title: "Reading Fit Review",
    href: "/teacher/reading-fit",
    eyebrow: "Reading fit",
    description: "Review finished books missing learner reflection or placement signals.",
  },
  {
    title: "Student Follow-up",
    eyebrow: "Learners",
    description: "Placeholder for assigned work, student task follow-up, and prep reminders when that workflow is ready.",
    disabled: true,
  },
];

function isSuperTeacherFlag(value: unknown) {
  return value === true || value === "true";
}

function AttentionCardGrid({ cards }: { cards: AttentionCard[] }) {
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

export default function TeacherNeedsAttentionPage() {
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
        setMessage("Please sign in to use Needs Attention.");
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
          <h1 className="mt-2 text-2xl font-black text-stone-900">Needs Attention</h1>
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
            Review workspace
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-900">
            Needs Attention
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
            Jump to review queues and learner follow-up areas for work waiting on teacher attention. This page only groups links for now.
          </p>
        </section>

        <section className="mt-6">
          <AttentionCardGrid cards={attentionCards} />
        </section>
      </div>
    </main>
  );
}
