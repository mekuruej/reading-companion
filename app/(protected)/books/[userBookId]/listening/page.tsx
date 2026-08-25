// Listening
//

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AccessDeniedMessage from "@/components/AccessDeniedMessage";
import { getAppAccessStatus, isMissingAppAccessColumnError } from "@/lib/access/appAccess";
import { getFeatureAccess } from "@/lib/access/featureAccess";
import { getEnglishNativeTrackerBookMode } from "@/lib/books/englishNativeTracker";
import { supabase } from "@/lib/supabaseClient";
import ReadingJournalPanel from "../components/ReadingJournalPanel";
import SimpleTimedSessionPage from "../_shared/timed-session/SimpleTimedSessionPage";
import { CuriosityReadingExperience } from "../curiosity-reading/WordTimerExperience";

type ListeningViewMode = "listening" | "workspace";
type NativeSessionMode = "fluid" | "listening";
type ProfileRole = "teacher" | "member" | "super_teacher" | "admin";

function isSuperTeacherFlag(value: unknown) {
  return value === true || value === "true";
}

export default function ListeningPage() {
  const params = useParams<{ userBookId: string }>();
  const userBookId = params.userBookId;
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [canSaveWordsWhileListening, setCanSaveWordsWhileListening] = useState(false);
  const [canUseReadingJournal, setCanUseReadingJournal] = useState(false);
  const [journalOwnerUserId, setJournalOwnerUserId] = useState<string | null>(null);
  const [favoriteQuotes, setFavoriteQuotes] = useState<string | null>(null);
  const [bookLanguageCode, setBookLanguageCode] = useState<string | null>(null);
  const [isNativeListeningWorkspace, setIsNativeListeningWorkspace] = useState(false);
  const [nativeSessionMode, setNativeSessionMode] = useState<NativeSessionMode>("listening");
  const [accessMessage, setAccessMessage] = useState("");
  const [viewMode, setViewMode] = useState<ListeningViewMode>("listening");

  useEffect(() => {
    let cancelled = false;

    async function loadListeningAccess() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userError || !user || !userBookId) {
        setAccessMessage("Please sign in to use listening progress.");
        setCheckingAccess(false);
        return;
      }

      const { data: userBook, error: userBookError } = await supabase
        .from("user_books")
        .select(
          `
          id,
          user_id,
          favorite_quotes,
          books (
            language_code
          )
        `
        )
        .eq("id", userBookId)
        .maybeSingle();

      if (cancelled) return;

      if (userBookError || !userBook) {
        if (userBookError) {
          console.error("Error loading Listening book for workspace access:", userBookError);
        }
        setCanUseReadingJournal(false);
        setJournalOwnerUserId(null);
        setFavoriteQuotes(null);
        setBookLanguageCode(null);
        setIsNativeListeningWorkspace(false);
        setAccessMessage("You do not have access to this book.");
        setCheckingAccess(false);
        return;
      }

      const book = Array.isArray((userBook as any).books)
        ? (userBook as any).books[0]
        : (userBook as any).books;
      setBookLanguageCode(book?.language_code ?? null);

      const trackerMode = await getEnglishNativeTrackerBookMode({ supabase, userBookId });

      if (cancelled) return;
      const nativeListeningWorkspace = trackerMode.isEnglishNativeTrackerBook;

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
          .is("archived_at", null)
          .limit(1)
          .maybeSingle();

        if (teacherStudentError) {
          console.error("Error checking Listening workspace teacher access:", teacherStudentError);
        }

        canAccessBook = !!teacherStudentLink;
      }

      if (!profileError && profile) {
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

        setCanSaveWordsWhileListening(
          !trackerMode.isEnglishNativeTrackerBook && featureAccess.canUseListeningWordCapture
        );
        setCanUseReadingJournal(
          Boolean(canAccessBook && ownerUserId && (trackerMode.isEnglishNativeTrackerBook || featureAccess.canUseStoryNotes))
        );
        setJournalOwnerUserId(canAccessBook ? ownerUserId : null);
        setFavoriteQuotes(canAccessBook ? ((userBook as any).favorite_quotes ?? null) : null);
        setIsNativeListeningWorkspace(Boolean(canAccessBook && nativeListeningWorkspace));
        setAccessMessage(canAccessBook ? "" : "You do not have access to this book.");
      } else {
        setCanSaveWordsWhileListening(false);
        setCanUseReadingJournal(false);
        setJournalOwnerUserId(null);
        setFavoriteQuotes(null);
        setBookLanguageCode(null);
        setIsNativeListeningWorkspace(false);
        setAccessMessage("Could not verify listening access.");
      }

      setCheckingAccess(false);
    }

    void loadListeningAccess();

    return () => {
      cancelled = true;
    };
  }, [userBookId]);

  useEffect(() => {
    if (!canUseReadingJournal && viewMode === "workspace") {
      setViewMode("listening");
    }
  }, [canUseReadingJournal, viewMode]);

  if (checkingAccess) {
    return (
      <main className="min-h-screen bg-stone-50 p-6">
        <div className="mx-auto max-w-3xl rounded-3xl border border-stone-200 bg-white p-6 text-stone-600 shadow-sm">
          Loading...
        </div>
      </main>
    );
  }

  if (accessMessage && !isNativeListeningWorkspace && !canSaveWordsWhileListening) {
    return (
      <AccessDeniedMessage
        message={accessMessage}
        backHref={userBookId ? `/books/${encodeURIComponent(userBookId)}` : "/books"}
        backLabel="Back to Book Hub"
      />
    );
  }

  const showReadingWorkspace = viewMode === "workspace" && canUseReadingJournal && journalOwnerUserId;
  const listeningExperience = isNativeListeningWorkspace ? (
    <SimpleTimedSessionPage
      sessionMode="listening"
      allowNativeReadListenToggle
      onActiveSessionModeChange={setNativeSessionMode}
      eyebrow="Listening"
      title="Read / Listen"
      subtitle="Timed listening"
      description="Listen to your audiobook and log the time separately from reading pace."
      saveSuccessMessage="Your listening session has been saved in Reading History."
      startLocationLabel="Start page optional"
      endLocationLabel="End page optional"
      sessionLocationNote="Page numbers are optional. If you leave them blank, only the time will be saved. Pace stats can only be generated with page numbers."
      listeningLocationNote="Optional. Add an audiobook position like Chapter 8, 37%, or 3:12:45. Listening time stays separate from reading pace."
      embedded
      workspaceCompact={Boolean(showReadingWorkspace)}
    />
  ) : canSaveWordsWhileListening ? (
    <CuriosityReadingExperience
      experienceMode="listening"
      embedded
      workspaceCompact={Boolean(showReadingWorkspace)}
    />
  ) : (
    <SimpleTimedSessionPage
      sessionMode="listening"
      eyebrow="Listening"
      title="Listening Timer"
      subtitle="Timer-only listening"
      description="Listen to this book or audiobook without word capture. Let the timer keep you company and log your listening time."
      saveSuccessMessage="Your listening session has been saved in Reading History."
      startLocationLabel="Start page optional"
      endLocationLabel="End page optional"
      sessionLocationNote="Progress is optional. If you leave it blank, only listening time will be saved."
      embedded
      workspaceCompact={Boolean(showReadingWorkspace)}
    />
  );

  return (
    <main
      className={[
        "min-h-screen",
        canSaveWordsWhileListening
          ? "bg-slate-100 px-3 py-4 sm:px-6 sm:py-8"
          : "bg-stone-50 p-6",
      ].join(" ")}
    >
      <div
        className={[
          "mx-auto space-y-4",
          showReadingWorkspace
            ? "max-w-[96rem]"
            : canSaveWordsWhileListening
              ? "max-w-5xl"
              : "max-w-4xl",
        ].join(" ")}
      >
        {canUseReadingJournal ? (
          <div className="hidden justify-end lg:flex">
            <div className="inline-flex rounded-2xl border border-stone-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode("listening")}
                className={`rounded-xl px-4 py-2 text-sm font-black transition ${
                  viewMode === "listening"
                    ? nativeSessionMode === "listening"
                      ? "bg-violet-700 text-white"
                      : "bg-emerald-700 text-white"
                    : "text-stone-600 hover:bg-stone-50"
                }`}
              >
                {isNativeListeningWorkspace
                  ? nativeSessionMode === "listening"
                    ? "Listening"
                    : "Reading"
                  : "Listening"}
              </button>
              <button
                type="button"
                onClick={() => setViewMode("workspace")}
                className={`rounded-xl px-4 py-2 text-sm font-black transition ${
                  viewMode === "workspace"
                    ? isNativeListeningWorkspace && nativeSessionMode !== "listening"
                      ? "bg-emerald-700 text-white"
                      : "bg-violet-700 text-white"
                    : isNativeListeningWorkspace && nativeSessionMode !== "listening"
                      ? "text-stone-600 hover:bg-emerald-50"
                      : "text-stone-600 hover:bg-violet-50"
                }`}
              >
                Reading Journal
              </button>
            </div>
          </div>
        ) : null}

        <div
          className={
            showReadingWorkspace
              ? "space-y-4 lg:grid lg:grid-cols-[minmax(24rem,30rem)_minmax(0,1fr)] lg:items-start lg:gap-4 lg:space-y-0 xl:grid-cols-[minmax(26rem,32rem)_minmax(0,1fr)]"
              : "space-y-4"
          }
        >
          <div className="min-w-0">{listeningExperience}</div>
          {showReadingWorkspace && journalOwnerUserId ? (
            <div className="hidden min-w-0 lg:block">
              <ReadingJournalPanel
                userBookId={userBookId}
                ownerUserId={journalOwnerUserId}
                favoriteQuotes={favoriteQuotes}
                bookLanguageCode={bookLanguageCode}
                compact
                vocabListHref={bookLanguageCode === "en" ? undefined : `/books/${encodeURIComponent(userBookId)}/words`}
                onFavoriteQuotesChange={setFavoriteQuotes}
              />
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
