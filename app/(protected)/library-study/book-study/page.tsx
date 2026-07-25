"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import LibraryBookActionIndex from "@/components/library/LibraryBookActionIndex";
import { getAppAccessStatus, isMissingAppAccessColumnError } from "@/lib/access/appAccess";
import { getFeatureAccess } from "@/lib/access/featureAccess";
import { supabase } from "@/lib/supabaseClient";

type ProfileAccessRow = {
  role: string | null;
  is_super_teacher: boolean | string | null;
  app_access_type: string | null;
  app_access_expires_at: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
};

function BookStudyFreeState({ hasSavedWords, accessReason }: { hasSavedWords: boolean; accessReason: string }) {
  const accessTitle = accessReason === "expired" ? "Reading Access ended" : "Free reading tracker";

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-8">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            {accessTitle}
          </p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">
            Book tracking is still available
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            Book Study uses saved words from individual books. With your current access, you can keep reading, log time, and check basic book stats{hasSavedWords ? ", plus open your read-only vocabulary lists" : ""}.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link
              href="/books"
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              My Library
            </Link>
            {hasSavedWords ? (
              <Link
                href="/library/vocab-list-index"
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Vocabulary Lists
              </Link>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

export default function BookStudyPage() {
  const [loadingAccess, setLoadingAccess] = useState(true);
  const [canUseBookStudy, setCanUseBookStudy] = useState(false);
  const [accessReason, setAccessReason] = useState<string>("free");
  const [hasSavedWords, setHasSavedWords] = useState(false);

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
            setCanUseBookStudy(false);
            setAccessReason("free");
            setHasSavedWords(false);
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

        const appStatus = profile
          ? getAppAccessStatus(profile)
          : { hasFullAccess: false, reason: "free" };
        const featureAccess = getFeatureAccess({
          role: profile?.role,
          isSuperTeacher: profile?.is_super_teacher,
          hasFullAccess: appStatus.hasFullAccess,
        });

        if (mounted) {
          setCanUseBookStudy(featureAccess.canUseBookStudy);
          setAccessReason(appStatus.reason);
        }

        const { data: savedWordRows, error: savedWordError } = await supabase
          .from("user_book_words")
          .select("id")
          .limit(1);

        if (savedWordError) {
          console.error("Error checking saved vocabulary:", savedWordError);
          if (mounted) setHasSavedWords(false);
        } else if (mounted) {
          setHasSavedWords((savedWordRows ?? []).length > 0);
        }
      } catch (error) {
        console.error("Error loading Book Study access:", error);
        if (mounted) {
          setCanUseBookStudy(false);
          setAccessReason("free");
          setHasSavedWords(false);
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

  if (loadingAccess) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-5 sm:px-5 sm:py-8">
        <div className="mx-auto max-w-6xl text-sm text-slate-600">
          Loading Book Flashcards...
        </div>
      </main>
    );
  }

  if (!canUseBookStudy) {
    return <BookStudyFreeState hasSavedWords={hasSavedWords} accessReason={accessReason} />;
  }

  return (
    <LibraryBookActionIndex
      eyebrow="Book Flashcards"
      title="Open Book Flashcards"
      description="Choose a book to study its saved vocabulary with flashcards."
      actionLabel="Book Flashcards"
      emptyText="No books with saved words yet."
      accent="stone"
      requireSavedWords
      backHref="/library-study"
      backLabel="Back to Study Hub"
      hrefForBook={(userBookId) => `/books/${userBookId}/study`}
    />
  );
}
