// Book Flashcards Index
//

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import LibraryBookActionIndex from "@/components/library/LibraryBookActionIndex";
import { getAppAccessStatus, isMissingAppAccessColumnError } from "@/lib/access/appAccess";
import { getFeatureAccess } from "@/lib/access/featureAccess";
import { resolveReturnTo, withReturnTo } from "@/lib/navigation/returnTo";
import { supabase } from "@/lib/supabaseClient";

type ProfileAccessRow = {
  role: string | null;
  is_super_teacher: boolean | string | null;
  app_access_type: string | null;
  app_access_expires_at: string | null;
  trial_started_at: string | null;
};

function BookFlashcardsFullAccessLockedState({
  backHref,
  backLabel,
}: {
  backHref: string;
  backLabel: string;
}) {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-5 sm:px-5 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href={backHref}
          className="mb-4 inline-flex text-sm font-semibold text-stone-500 hover:text-stone-950"
        >
          ← {backLabel}
        </Link>

        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">
            Japanese Learning 🔒
          </p>

          <h1 className="mt-2 text-3xl font-black text-stone-950">
            Book Flashcards are locked
          </h1>

          <p className="mt-3 text-sm leading-6 text-stone-600">
            Book Flashcards use saved vocabulary from your books, so they are part
            of Japanese Learning. Your book tracking, reading reflections, and
            timer-only reading tools are still available.
          </p>
        </div>
      </div>
    </main>
  );
}

export default function BookFlashcardsIndexPage() {
  const searchParams = useSearchParams();
  const [loadingAccess, setLoadingAccess] = useState(true);
  const [canUseBookFlashcards, setCanUseBookFlashcards] = useState(false);
  const backDestination = resolveReturnTo(searchParams.get("returnTo"), {
    href: "/library-study/book-study",
    label: "Back to Book Study",
  });

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

        const profileResult = await supabase
          .from("profiles")
          .select("role, is_super_teacher, app_access_type, app_access_expires_at, trial_started_at")
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

        const appStatus = profile
          ? getAppAccessStatus(profile)
          : { hasFullAccess: false, reason: "free" as const };
        const featureAccess = getFeatureAccess({
          role: profile?.role,
          isSuperTeacher: profile?.is_super_teacher,
          hasFullAccess: appStatus.hasFullAccess,
          isTrialActive: appStatus.reason === "trial",
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
    return (
      <BookFlashcardsFullAccessLockedState
        backHref={backDestination.href}
        backLabel={backDestination.label}
      />
    );
  }

  return (
    <LibraryBookActionIndex
      eyebrow="Book Flashcards"
      title="Open Book Flashcards"
      description="Choose a book to study its saved vocabulary with flashcards."
      actionLabel="Book Flashcards"
      accent="stone"
      requireSavedWords
      backHref={backDestination.href}
      backLabel={backDestination.label}
      hrefForBook={(userBookId) =>
        withReturnTo(`/books/${userBookId}/study`, "book-flashcards")
      }
    />
  );
}
