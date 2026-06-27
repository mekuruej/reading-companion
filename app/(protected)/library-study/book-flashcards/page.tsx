// Book Flashcards Index
//

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LibraryBookActionIndex from "@/components/library/LibraryBookActionIndex";
import { getAppAccessStatus } from "@/lib/access/appAccess";
import { getFeatureAccess } from "@/lib/access/featureAccess";
import { supabase } from "@/lib/supabaseClient";

type ProfileAccessRow = {
  role: string | null;
  app_access_type: string | null;
  app_access_expires_at: string | null;
};

function BookFlashcardsFullAccessLockedState() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5 sm:px-5 sm:py-8">
      <div className="mx-auto max-w-3xl rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">
          Full access feature
        </p>

        <h1 className="mt-2 text-3xl font-black text-stone-950">
          Book Flashcards are locked
        </h1>

        <p className="mt-3 text-sm leading-6 text-stone-600">
          Book Flashcards use saved vocabulary from your books, so they are part
          of Mekuru full access. Your book tracking, reading reflections, and
          timer-only reading tools are still available.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/library-study/book-study"
            className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black"
          >
            Back to Book Study
          </Link>

          <Link
            href="/library-study"
            className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
          >
            Back to Study Hub
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function BookFlashcardsIndexPage() {
  const [loadingAccess, setLoadingAccess] = useState(true);
  const [canUseBookFlashcards, setCanUseBookFlashcards] = useState(false);

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
          if (mounted) setCanUseBookFlashcards(false);
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

        if (mounted) {
          setCanUseBookFlashcards(featureAccess.canUseStudyFlashcards);
        }
      } catch (error) {
        console.error("Error loading Book Flashcards access:", error);
        if (mounted) setCanUseBookFlashcards(false);
      } finally {
        if (mounted) setLoadingAccess(false);
      }
    }

    void loadAccess();

    return () => {
      mounted = false;
    };
  }, []);

  if (loadingAccess) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-5 sm:px-5 sm:py-8">
        <div className="mx-auto max-w-6xl text-sm text-slate-600">
          Loading Book Flashcards…
        </div>
      </main>
    );
  }

  if (!canUseBookFlashcards) {
    return <BookFlashcardsFullAccessLockedState />;
  }

  return (
    <LibraryBookActionIndex
      eyebrow="Book Flashcards"
      title="Choose a book for flashcards"
      description="Choose a book to review saved vocabulary from that specific book."
      actionLabel="Book Flashcards"
      accent="stone"
      backHref="/library-study/book-study"
      backLabel="Back to Book Study"
      hrefForBook={(userBookId) => `/books/${userBookId}/study`}
    />
  );
}
