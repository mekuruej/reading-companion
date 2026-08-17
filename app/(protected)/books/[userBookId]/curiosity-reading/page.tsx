// Curiosity Reading Page
//
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAppAccessStatus, isMissingAppAccessColumnError } from "@/lib/access/appAccess";
import { getFeatureAccess } from "@/lib/access/featureAccess";
import { canUseFullAccessFeature } from "@/lib/access/requireFullAccess";
import { getEnglishNativeTrackerBookMode } from "@/lib/books/englishNativeTracker";
import { supabase } from "@/lib/supabaseClient";
import ReadingJournalPanel from "../components/ReadingJournalPanel";
import {
  CuriosityReadingExperience,
  type CuriosityReadingJournalContext,
} from "./WordTimerExperience";

type CuriosityViewMode = "curiosity" | "workspace";
type ProfileRole = "teacher" | "member" | "student" | "super_teacher" | "admin";

function isSuperTeacherFlag(value: unknown) {
  return value === true || value === "true";
}

export default function CuriosityReadingPage() {
  const router = useRouter();
  const params = useParams<{ userBookId: string }>();
  const userBookId = params.userBookId;
  const [checking, setChecking] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [canUseReadingWorkspace, setCanUseReadingWorkspace] = useState(false);
  const [journalOwnerUserId, setJournalOwnerUserId] = useState<string | null>(null);
  const [favoriteQuotes, setFavoriteQuotes] = useState<string | null>(null);
  const [bookLanguageCode, setBookLanguageCode] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<CuriosityViewMode>("curiosity");
  const [journalContext, setJournalContext] = useState<CuriosityReadingJournalContext>({
    currentPageNumber: null,
    selectedChapterLabel: null,
    selectedChapterNumber: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function checkAccess() {
      const mode = await getEnglishNativeTrackerBookMode({ supabase, userBookId });
      if (cancelled) return;

      if (mode.isEnglishNativeTrackerBook) {
        setBlocked(true);
        router.replace(`/books/${userBookId}`);
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userError || !user || !userBookId) {
        setCanUseReadingWorkspace(false);
        setJournalOwnerUserId(null);
        setFavoriteQuotes(null);
        setBookLanguageCode(null);
        setChecking(false);
        return;
      }

      const { data: userBook, error: userBookError } = await supabase
        .from("user_books")
        .select("id, user_id, favorite_quotes, books ( language_code )")
        .eq("id", userBookId)
        .maybeSingle();

      if (cancelled) return;

      if (userBookError || !userBook) {
        if (userBookError) {
          console.error("Error loading Curiosity Reading workspace access:", userBookError);
        }
        setCanUseReadingWorkspace(false);
        setJournalOwnerUserId(null);
        setFavoriteQuotes(null);
        setBookLanguageCode(null);
        setChecking(false);
        return;
      }

      const book = Array.isArray((userBook as any).books)
        ? (userBook as any).books[0]
        : (userBook as any).books;
      setBookLanguageCode(book?.language_code ?? null);

      const profileResult = await supabase
        .from("profiles")
        .select("role, is_super_teacher, app_access_type, app_access_expires_at, trial_started_at")
        .eq("id", user.id)
        .maybeSingle();
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

      if (cancelled) return;

      if (profileError || !profile) {
        if (profileError) {
          console.error("Error loading Curiosity Reading workspace profile:", profileError);
        }
        setCanUseReadingWorkspace(false);
        setJournalOwnerUserId(null);
        setFavoriteQuotes(null);
        setBookLanguageCode(null);
        setChecking(false);
        return;
      }

      const role = (profile?.role as ProfileRole | null) ?? "member";
      const isSuperTeacher = role === "super_teacher" || isSuperTeacherFlag(profile?.is_super_teacher);
      const ownerUserId = (userBook as any).user_id as string | null;
      let canAccessBook = ownerUserId === user.id || isSuperTeacher || role === "admin";

      if (!canAccessBook && role === "teacher" && ownerUserId) {
        const { data: teacherStudentLink, error: teacherStudentError } = await supabase
          .from("teacher_students")
          .select("id")
          .eq("teacher_id", user.id)
          .eq("student_id", ownerUserId)
          .limit(1)
          .maybeSingle();

        if (teacherStudentError) {
          console.error("Error checking Curiosity Reading workspace teacher access:", teacherStudentError);
        }

        canAccessBook = !!teacherStudentLink;
      }

      const appAccessStatus = getAppAccessStatus({
        role: isSuperTeacher ? "super_teacher" : role,
        app_access_type: profile.app_access_type ?? null,
        app_access_expires_at: profile.app_access_expires_at ?? null,
      });
      const featureAccess = getFeatureAccess({
        role: isSuperTeacher ? "super_teacher" : role,
        isSuperTeacher: profile.is_super_teacher,
        hasFullAccess: appAccessStatus.hasFullAccess,
        isTrialActive: appAccessStatus.reason === "trial",
      });
      const canUseCuriosityReading = canUseFullAccessFeature(featureAccess, "curiosity_reading");

      setCanUseReadingWorkspace(
        Boolean(canAccessBook && ownerUserId && canUseCuriosityReading && featureAccess.canUseStoryNotes)
      );
      setJournalOwnerUserId(canAccessBook ? ownerUserId : null);
      setFavoriteQuotes(canAccessBook ? ((userBook as any).favorite_quotes ?? null) : null);
      setChecking(false);
    }

    void checkAccess();

    return () => {
      cancelled = true;
    };
  }, [router, userBookId]);

  useEffect(() => {
    if (!canUseReadingWorkspace && viewMode === "workspace") {
      setViewMode("curiosity");
    }
  }, [canUseReadingWorkspace, viewMode]);

  if (checking || blocked) {
    return (
      <main className="min-h-screen bg-stone-50 p-6">
        <div className="mx-auto max-w-3xl rounded-3xl border border-stone-200 bg-white p-6 text-sm font-semibold text-stone-600 shadow-sm">
          Opening Book Hub...
        </div>
      </main>
    );
  }

  if (!canUseReadingWorkspace || !journalOwnerUserId) {
    return <CuriosityReadingExperience experienceMode="curiosity" />;
  }

  const showReadingWorkspace = viewMode === "workspace";
  const readingJournalPanel = (
    <ReadingJournalPanel
      userBookId={userBookId}
      ownerUserId={journalOwnerUserId}
      favoriteQuotes={favoriteQuotes}
      bookLanguageCode={bookLanguageCode}
      currentPageNumber={journalContext.currentPageNumber}
      selectedChapterLabel={journalContext.selectedChapterLabel}
      selectedChapterNumber={journalContext.selectedChapterNumber}
      compact
      onFavoriteQuotesChange={setFavoriteQuotes}
    />
  );
  const curiosityExperience = (
    <CuriosityReadingExperience
      experienceMode="curiosity"
      embedded
      workspaceCompact={showReadingWorkspace}
      workspaceAside={showReadingWorkspace ? readingJournalPanel : undefined}
      onReadingJournalContextChange={setJournalContext}
    />
  );

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-8">
      <div
        className={[
          "mx-auto space-y-4",
          showReadingWorkspace ? "max-w-[96rem]" : "max-w-5xl",
        ].join(" ")}
      >
        <div className="hidden justify-end lg:flex">
          <div className="inline-flex rounded-2xl border border-stone-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode("curiosity")}
              className={`rounded-xl px-4 py-2 text-sm font-black transition ${
                viewMode === "curiosity"
                  ? "bg-stone-900 text-white"
                  : "text-stone-600 hover:bg-stone-50"
              }`}
            >
              Curiosity Reading
            </button>
            <button
              type="button"
              onClick={() => setViewMode("workspace")}
              className={`rounded-xl px-4 py-2 text-sm font-black transition ${
                viewMode === "workspace"
                  ? "bg-violet-700 text-white"
                  : "text-stone-600 hover:bg-violet-50"
              }`}
            >
              Reading Workspace
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="min-w-0">{curiosityExperience}</div>
          {showReadingWorkspace ? (
            <div className="min-w-0 md:hidden">
              {readingJournalPanel}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
