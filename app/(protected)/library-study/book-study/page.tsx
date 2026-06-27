"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAppAccessStatus } from "@/lib/access/appAccess";
import { getFeatureAccess } from "@/lib/access/featureAccess";
import { supabase } from "@/lib/supabaseClient";

type ProfileAccessRow = {
  role: string | null;
  app_access_type: string | null;
  app_access_expires_at: string | null;
};

const bookStudyTools = [
  {
    title: "Book Flashcards",
    href: "/library-study/book-flashcards",
    eyebrow: "One book",
    description:
      "Study saved words from one specific book. This is the simplest place to start when you want a focused book-based session.",
    className: "border-indigo-200 bg-indigo-50 text-indigo-950",
  },
  {
    title: "Saved Words Review",
    href: "/library-study/practice",
    eyebrow: "Across books",
    description:
      "Review saved words freely across your library. Review does not move colors.",
    className: "border-sky-200 bg-sky-50 text-sky-950",
  },
];

function BookStudyToolCard({
  tool,
  locked,
}: {
  tool: (typeof bookStudyTools)[number];
  locked: boolean;
}) {
  const content = (
    <>
      {locked ? (
        <div className="absolute right-4 top-4 rounded-full border border-stone-300 bg-white/85 px-2 py-0.5 text-xs font-black text-stone-500 shadow-sm">
          🔒
        </div>
      ) : null}

      <div className="text-xs font-black uppercase tracking-[0.18em] opacity-60">
        {tool.eyebrow}
      </div>

      <div className="mt-3 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black">{tool.title}</h2>
          <p className="mt-2 text-sm leading-6 opacity-80">
            {tool.description}
          </p>

          {locked ? (
            <div className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-stone-500">
              Full access
            </div>
          ) : null}
        </div>

        <span className="rounded-full bg-white/80 px-3 py-1 text-sm font-black shadow-sm transition group-hover:bg-white">
          {locked ? "Locked" : "→"}
        </span>
      </div>
    </>
  );

  if (locked) {
    return (
      <button
        type="button"
        disabled
        aria-disabled="true"
        title={`${tool.title} is a full-access feature.`}
        className="relative rounded-3xl border border-stone-200 bg-stone-100 p-5 text-left text-stone-500 opacity-70 shadow-sm grayscale"
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href={tool.href}
      className={`group relative rounded-3xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${tool.className}`}
    >
      {content}
    </Link>
  );
}

export default function BookStudyPage() {
  const [loadingAccess, setLoadingAccess] = useState(true);
  const [canUseBookStudy, setCanUseBookStudy] = useState(false);

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
          if (mounted) setCanUseBookStudy(false);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, app_access_type, app_access_expires_at")
          .eq("id", user.id)
          .maybeSingle<ProfileAccessRow>();

        if (profileError) throw profileError;

        const appStatus = profile
          ? getAppAccessStatus(profile)
          : { hasFullAccess: false };
        const featureAccess = getFeatureAccess({
          role: profile?.role,
          hasFullAccess: appStatus.hasFullAccess,
        });

        if (mounted) setCanUseBookStudy(featureAccess.canUseBookStudy);
      } catch (error) {
        console.error("Error loading Book Study access:", error);
        if (mounted) setCanUseBookStudy(false);
      } finally {
        if (mounted) setLoadingAccess(false);
      }
    }

    void loadAccess();

    return () => {
      mounted = false;
    };
  }, []);

  const lockStudyTools = loadingAccess || !canUseBookStudy;

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Book Study
          </p>

          <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
            Study Words From Your Books
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Choose where to study the words you saved while reading.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {bookStudyTools.map((tool) => (
            <BookStudyToolCard
              key={tool.href}
              tool={tool}
              locked={lockStudyTools}
            />
          ))}
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white/80 p-5 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-700">
            {canUseBookStudy
              ? "Book Study uses Mekuru’s full-access saved-word tools."
              : "Book Study is a full-access saved-word area. Book tracking, reflections, and reading timers are still available."}
          </p>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/library-study"
            className="inline-flex rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Back to Study Hub
          </Link>
        </div>
      </div>
    </main>
  );
}
