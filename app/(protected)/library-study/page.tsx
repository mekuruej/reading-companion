// Study Hub
//

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAppAccessStatus } from "@/lib/access/appAccess";
import { supabase } from "@/lib/supabaseClient";

type ProfileAccessRow = {
  role: string | null;
  is_super_teacher: boolean | null;
  app_access_type: string | null;
  app_access_expires_at: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
};

const studyPaths = [
  {
    title: "Foundation Sets",
    href: "/library-study/characters",
    eyebrow: "Start here",
    description:
      "Practice kana, kanji readings, and basic vocabulary sets. Good for simple, low-pressure study.",
    className: "border-sky-200 bg-sky-50 text-sky-950",
  },
  {
    title: "Book Study",
    href: "/library-study/book-study",
    eyebrow: "Saved words",
    description:
      "Study the words you saved from your books with focused book flashcards or free saved-word review.",
    className: "border-indigo-200 bg-indigo-50 text-indigo-950",
  },
  {
    title: "Advanced Study",
    href: "/library-study/advanced",
    eyebrow: "Vocabulary growth cycle",
    description:
      "Use Mekuru’s full saved-word cycle: save words from books, study them, follow colors, check ability, and notice them again while reading.",
    className: "border-indigo-200 bg-indigo-50 text-indigo-950",
  },
];

export default function StudyToolsPage() {
  const [loadingAccess, setLoadingAccess] = useState(true);
  const [hasFullAccess, setHasFullAccess] = useState(false);
  const [accessReason, setAccessReason] = useState<string>("free");

  useEffect(() => {
    let mounted = true;

    async function loadAccess() {
      setLoadingAccess(true);

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          if (mounted) {
            setHasFullAccess(false);
            setAccessReason("free");
          }
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, is_super_teacher, app_access_type, app_access_expires_at, trial_started_at, trial_ends_at")
          .eq("id", user.id)
          .maybeSingle<ProfileAccessRow>();

        if (profileError) throw profileError;

        const status = profile
          ? getAppAccessStatus(profile)
          : { hasFullAccess: false, reason: "free" };

        if (mounted) {
          setHasFullAccess(status.hasFullAccess);
          setAccessReason(status.reason);
        }
      } catch (error) {
        console.error("Error loading Study Hub access:", error);
        if (mounted) {
          setHasFullAccess(false);
          setAccessReason("free");
        }
      } finally {
        if (mounted) setLoadingAccess(false);
      }
    }

    void loadAccess();

    return () => {
      mounted = false;
    };
  }, []);

  const accessTitle =
    accessReason === "expired" ? "Reading Access ended" : "Free reading tracker";

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Mekuru Study
          </p>

          <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
            Study Hub
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Choose a study path. Foundation Sets are for kana, kanji, and basic vocabulary practice, Book Study is for everyday saved-word study, and Advanced Study explains Mekuru’s full vocabulary growth cycle.
          </p>
        </div>

        {loadingAccess ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-600">
              Loading reading access...
            </p>
          </section>
        ) : !hasFullAccess ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              {accessTitle}
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              Your reading life stays here
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Your library, book tracking, reading timers, basic book stats, and read-only vocabulary archive remain available. Full study tools return with Reading Access.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Link
                href="/books"
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                My Library
              </Link>
              <Link
                href="/library/book-hubs"
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Book Hubs
              </Link>
              <Link
                href="/library/vocab-list-index"
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Vocabulary Archive
              </Link>
            </div>
          </section>
        ) : (
        <div className="grid gap-5 md:grid-cols-3">
          {studyPaths.map((path) => (
            <Link
              key={path.href}
              href={path.href}
              className={`group rounded-3xl border p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${path.className}`}
            >
              <div className="text-xs font-black uppercase tracking-[0.18em] opacity-60">
                {path.eyebrow}
              </div>

              <div className="mt-3 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black">{path.title}</h2>
                  <p className="mt-2 text-sm leading-6 opacity-80">
                    {path.description}
                  </p>
                </div>

                <span className="rounded-full bg-white/80 px-3 py-1 text-sm font-black shadow-sm transition group-hover:bg-white">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
        )}

        {hasFullAccess ? (
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white/75 p-5 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-700">
            Not sure where to go?
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Start with Foundation Sets for character practice, basic vocabulary, and simple study tools.
          </p>

          <p className="mt-1 text-sm leading-6 text-slate-600">
            Choose Book Study when you want to study saved words from your
            books. Book Study uses Mekuru’s full-access saved-word tools.
          </p>
        </div>
        ) : null}
      </div>
    </main>
  );
}
