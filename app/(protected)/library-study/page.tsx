// Study Hub
//

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAppAccessStatus, isMissingAppAccessColumnError } from "@/lib/access/appAccess";
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
    requiresReadingAccess: false,
  },
  {
    title: "Book Study",
    href: "/library-study/book-study",
    eyebrow: "Saved words",
    description:
      "Choose one book and study the saved words from that book with focused flashcards.",
    className: "border-indigo-200 bg-indigo-50 text-indigo-950",
    lockedDescription:
      "Reading Access opens one-book saved-word study and book flashcards.",
    requiresReadingAccess: true,
  },
  {
    title: "Advanced Study",
    href: "/library-study/advanced",
    eyebrow: "Smart review",
    description:
      "Use cross-library smart review with Ability Check, Library Review, and Advanced Word Sky.",
    lockedDescription:
      "Reading Access opens the smart vocabulary growth cycle when these tools are ready for your library.",
    className: "border-violet-200 bg-violet-50 text-violet-950",
    requiresReadingAccess: true,
  },
];

function StudyPathCard({
  path,
  locked,
}: {
  path: (typeof studyPaths)[number];
  locked: boolean;
}) {
  return (
    <Link
      href={locked ? "/trial-ended" : path.href}
      className={`group relative rounded-3xl border p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${path.className}`}
    >
      {locked ? (
        <div className="absolute right-4 top-4 rounded-full border border-white/70 bg-white/80 px-2.5 py-1 text-xs font-black shadow-sm">
          Reading Access
        </div>
      ) : null}

      <div className="text-xs font-black uppercase tracking-[0.18em] opacity-60">
        {path.eyebrow}
      </div>

      <div className="mt-3 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black">{path.title}</h2>
          <p className="mt-2 text-sm leading-6 opacity-80">
            {locked ? path.lockedDescription : path.description}
          </p>
        </div>

        <span className="rounded-full bg-white/80 px-3 py-1 text-sm font-black shadow-sm transition group-hover:bg-white">
          {locked ? "Info" : "→"}
        </span>
      </div>
    </Link>
  );
}

export default function StudyToolsPage() {
  const [loadingAccess, setLoadingAccess] = useState(true);
  const [hasFullAccess, setHasFullAccess] = useState(false);

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
          }
          return;
        }

        const profileResult = await supabase
          .from("profiles")
          .select("role, is_super_teacher, app_access_type, app_access_expires_at, trial_started_at, trial_ends_at")
          .eq("id", user.id)
          .maybeSingle<ProfileAccessRow>();
        let profile: any = profileResult.data;
        let profileError = profileResult.error;

        if (isMissingAppAccessColumnError(profileError)) {
          const fallbackResult = await supabase
            .from("profiles")
            .select("role, is_super_teacher")
            .eq("id", user.id)
            .maybeSingle();

          profile = fallbackResult.data;
          profileError = fallbackResult.error;
        }

        if (profileError) throw profileError;

        const status = profile
          ? getAppAccessStatus(profile)
          : { hasFullAccess: false, reason: "free" };

        if (mounted) {
          setHasFullAccess(status.hasFullAccess);
        }
      } catch (error) {
        console.error("Error loading Study Hub access:", error);
        if (mounted) {
          setHasFullAccess(false);
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
            Choose a study path. Foundation Sets are for kana, kanji, and basic vocabulary practice, Book Study is for one-book saved-word study, and Advanced Study is for the smart vocabulary growth cycle.
          </p>
        </div>

        {loadingAccess ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-600">
              Loading reading access...
            </p>
          </section>
        ) : (
        <div className="grid gap-5 md:grid-cols-3">
          {studyPaths.map((path) => (
            <StudyPathCard
              key={path.href}
              path={path}
              locked={path.requiresReadingAccess && !hasFullAccess}
            />
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
            Choose Book Study when you want flashcards from one specific book.
            Choose Advanced Study for Library Review, Ability Check, and Word Sky.
          </p>
        </div>
        ) : null}
      </div>
    </main>
  );
}
