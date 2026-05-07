// Teacher Hub
//

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type TeacherCard = {
  title: string;
  href: string;
  eyebrow: string;
  description: string;
  status: "Active" | "Planned" | "Later";
  count?: number | null;
  countLabel?: string;
  disabled?: boolean;
};

type QueueCounts = {
  books: number | null;
  kanji: number | null;
  words: number | null;
  readingFit: number | null;
};

const lessonPrepCards: TeacherCard[] = [
  {
    title: "My Students",
    href: "/teacher/students",
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

function TeacherCardGrid({ cards }: { cards: TeacherCard[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => {
        const cardContent = (
          <div
            className={`h-full rounded-3xl border p-5 shadow-sm transition ${card.disabled
              ? "border-stone-200 bg-stone-50 text-stone-500"
              : "border-stone-200 bg-white hover:-translate-y-0.5 hover:shadow-md"
              }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                {card.eyebrow}
              </p>

              <span
                className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${card.status === "Active"
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

            {card.count != null ? (
              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <div className="text-3xl font-black text-stone-900">{card.count}</div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                  {card.countLabel ?? "open"}
                </div>
              </div>
            ) : null}

            <p className="mt-3 text-sm leading-6 text-stone-600">
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
  const [counts, setCounts] = useState<QueueCounts>({
    books: null,
    kanji: null,
    words: null,
    readingFit: null,
  });
  const [isSuperTeacher, setIsSuperTeacher] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void loadCounts();
  }, []);

  async function loadCounts() {
    setMessage("");

    const { data: auth, error: authError } = await supabase.auth.getUser();
    const user = auth?.user;

    if (authError || !user) {
      setMessage("Please sign in to see teacher queues.");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, is_super_teacher")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      setMessage(profileError.message ?? "Could not load teacher profile.");
      return;
    }

    const isTeacher =
      profile?.role === "teacher" ||
      profile?.role === "super_teacher" ||
      !!profile?.is_super_teacher;
    const hasSuperTeacherAccess =
      profile?.role === "super_teacher" || !!profile?.is_super_teacher;

    setIsSuperTeacher(hasSuperTeacherAccess);

    if (!isTeacher) {
      setMessage("Teacher access is required.");
      return;
    }

    let bookCount: number | null = null;

    if (hasSuperTeacherAccess) {
      const { count } = await supabase
        .from("user_alerts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("type", "book_flag");

      bookCount = count ?? 0;
    }

    const { count: kanjiCount } = await supabase
      .from("vocabulary_kanji_map")
      .select("id", { count: "exact", head: true })
      .eq("flagged_for_review", true);

    const { data: teacherLinks } = await supabase
      .from("teacher_students")
      .select("student_id")
      .eq("teacher_id", user.id);

    const studentIds = Array.from(
      new Set([
        user.id,
        ...((teacherLinks ?? [])
          .map((row: any) => row.student_id)
          .filter(Boolean) as string[]),
      ])
    );

    let wordCount = 0;
    let readingFitCount = 0;

    if (studentIds.length > 0) {
      const { data: userBooks } = await supabase
        .from("user_books")
        .select("id, finished_at, reader_level, rating_difficulty")
        .in("user_id", studentIds);

      const userBookIds = (userBooks ?? []).map((book: any) => book.id).filter(Boolean);

      readingFitCount = (userBooks ?? []).filter((book: any) => {
        const isFinished = !!book.finished_at;
        const missingReaderLevel = !String(book.reader_level ?? "").trim();
        const missingDifficulty = book.rating_difficulty == null;

        return isFinished && (missingReaderLevel || missingDifficulty);
      }).length;

      if (userBookIds.length > 0) {
        const { count } = await supabase
          .from("user_book_words")
          .select("id", { count: "exact", head: true })
          .in("user_book_id", userBookIds)
          .eq("flagged_for_review", true);

        wordCount = count ?? 0;
      }
    }

    setCounts({
      books: bookCount ?? 0,
      kanji: kanjiCount ?? 0,
      words: wordCount,
      readingFit: readingFitCount,
    });
  }


  const workbenchCards: TeacherCard[] = [
    {
      title: "Reading Fit Needed",
      href: "/teacher/reading-fit",
      eyebrow: "Community signals",
      description:
        "Finished books missing Community Reading Fit signals. Please fill these in after finishing so Mekuru can learn what fits which readers.",
      status: "Active",
      count: counts.readingFit,
      countLabel: "missing fit signals",
    },
    ...(isSuperTeacher
      ? [
        {
          title: "Books Needing My Attention",
          href: "/teacher/books",
          eyebrow: "Book flags",
          description:
            "Books marked for super-teacher review. Use this for missing info, odd metadata, or prep decisions.",
          status: "Active" as const,
          count: counts.books,
          countLabel: "book flags",
        },
      ]
      : []),
    {
      title: "Kanji Needing My Attention",
      href: "/teacher/kanji",
      eyebrow: "Kanji enrichment",
      description:
        "Kanji readings flagged from study plus vocabulary that needs kanji-reading enrichment.",
      status: "Active",
      count: counts.kanji,
      countLabel: "kanji flags",
    },
    {
      title: "Words Needing My Attention",
      href: "/teacher/words",
      eyebrow: "Vocabulary review",
      description:
        "Words flagged from study or vocabulary work. This can grow into the vocabulary-cache problem queue.",
      status: "Active",
      count: counts.words,
      countLabel: "word flags",
    },
  ];

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

        {message ? <p className="mt-3 text-sm text-amber-700">{message}</p> : null}
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
            Needs My Attention
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Review books, kanji, and words that need teacher judgment.
          </p>
        </div>

        <TeacherCardGrid cards={workbenchCards} />
      </section>
    </main>
  );
}
