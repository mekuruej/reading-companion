"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useBookProgress } from "@/components/books/BookProgressProvider";
import { getAppAccessStatus, isMissingAppAccessColumnError } from "@/lib/access/appAccess";
import { canUseFullAccessFeature } from "@/lib/access/requireFullAccess";
import { getFeatureAccess } from "@/lib/access/featureAccess";
import {
  canUseActiveJapaneseLearningJournal,
  emptyJapaneseLearningJournalArchiveTabs,
  isJapaneseLearningBook,
  type JapaneseLearningJournalArchiveTabs,
} from "@/lib/access/readingCompanion";
import { wantsJapaneseLearning } from "@/lib/access/japaneseLearningIntent";
import { loadJapaneseLearningFreeFeatureFlags } from "@/lib/access/japaneseLearningFreeFeatures";
import { readResumeCue } from "@/lib/books/readResumeCue";
import {
  clearPersistedTimedSession,
  hasUnfinishedTimedSession,
  readPersistedTimedSession,
} from "../_shared/timed-session/timedSessionPersistence";
import SimpleTimedSessionPage from "../_shared/timed-session/SimpleTimedSessionPage";
import { CuriosityReadingExperience } from "../curiosity-reading/WordTimerExperience";
import ReadingJournalPanel from "../components/ReadingJournalPanel";
import { supabase } from "@/lib/supabaseClient";

type ReadingMode = "fluid" | "curiosity";
type ReaderJournalContext = {
  userBookId: string;
  ownerUserId: string;
  bookLanguageCode: string | null;
  pageCount: number | null;
  canUseJapaneseLearningJournal: boolean;
  japaneseLearningArchiveTabs: JapaneseLearningJournalArchiveTabs;
};

const japaneseLearningArchiveTables: Record<keyof JapaneseLearningJournalArchiveTabs, string> = {
  detective: "user_book_detective_entries",
  setting: "user_book_setting_items",
  cultural: "user_book_cultural_items",
};

async function hasJapaneseLearningArchiveRows(userBookId: string, table: string) {
  const { count, error } = await supabase
    .from(table as any)
    .select("id", { count: "exact", head: true })
    .eq("user_book_id", userBookId);
  if (error) {
    console.error("Error checking Read journal archive rows:", { table, error });
    return false;
  }
  return (count ?? 0) > 0;
}

async function loadJapaneseLearningArchiveTabs(userBookId: string) {
  const [detective, setting, cultural] = await Promise.all([
    hasJapaneseLearningArchiveRows(userBookId, japaneseLearningArchiveTables.detective),
    hasJapaneseLearningArchiveRows(userBookId, japaneseLearningArchiveTables.setting),
    hasJapaneseLearningArchiveRows(userBookId, japaneseLearningArchiveTables.cultural),
  ]);
  return { detective, setting, cultural };
}

function modeFromQuery(value: string | null): ReadingMode {
  return value === "curiosity" ? "curiosity" : "fluid";
}

export default function ReadPage() {
  const params = useParams<{ userBookId: string }>();
  const userBookId = params.userBookId;
  const router = useRouter();
  const searchParams = useSearchParams();
  const progress = useBookProgress();
  const refreshSummary = progress.refreshSummary;
  const [mode, setMode] = useState<ReadingMode>(() => modeFromQuery(searchParams.get("mode")));
  const [curiosityAvailable, setCuriosityAvailable] = useState(false);
  const [checkingCuriosityAccess, setCheckingCuriosityAccess] = useState(true);
  const [currentTimerActive, setCurrentTimerActive] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);
  const [journalContext, setJournalContext] = useState<ReaderJournalContext | null>(null);
  const [journalFavoriteQuotes, setJournalFavoriteQuotes] = useState<string | null>(null);
  const [journalPageContext, setJournalPageContext] = useState({
    currentPageNumber: null as number | null,
    selectedChapterLabel: null as string | null,
    selectedChapterNumber: null as number | null,
  });

  useEffect(() => {
    let cancelled = false;

    async function checkCuriosityAvailability() {
      setCheckingCuriosityAccess(true);
      setCuriosityAvailable(false);
      setJournalContext(null);
      setJournalFavoriteQuotes(null);
      setJournalOpen(false);
      setJournalPageContext({
        currentPageNumber: null,
        selectedChapterLabel: null,
        selectedChapterNumber: null,
      });

      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (cancelled || authError || !user?.id || !userBookId) return;

        const [{ data: userBook, error: userBookError }, profileResult] = await Promise.all([
          supabase
            .from("user_books")
            .select("user_id, favorite_quotes, books(language_code, page_count)")
            .eq("id", userBookId)
            .maybeSingle(),
          supabase
            .from("profiles")
            .select("role, is_super_teacher, target_language, japanese_learning_enabled, app_access_type, app_access_expires_at")
            .eq("id", user.id)
            .maybeSingle(),
        ]);

        if (cancelled || userBookError || !userBook) return;

        let profile = profileResult.data;
        let profileError = profileResult.error;
        if (isMissingAppAccessColumnError(profileError)) {
          const fallback = await supabase
            .from("profiles")
            .select("role, is_super_teacher, target_language, japanese_learning_enabled")
            .eq("id", user.id)
            .maybeSingle();
          profile = fallback.data
            ? { ...fallback.data, app_access_type: null, app_access_expires_at: null }
            : null;
          profileError = fallback.error;
        }
        if (cancelled || profileError || !profile) return;

        const book = Array.isArray(userBook.books) ? userBook.books[0] : userBook.books;
        const ownerUserId = userBook.user_id;
        const isJapaneseBook = isJapaneseLearningBook(book?.language_code ?? null);
        const wantsJapaneseTools = wantsJapaneseLearning(profile);
        const isSuperTeacher = profile.role === "super_teacher" ||
          profile.is_super_teacher === true ||
          profile.is_super_teacher === "true";
        let featureAccess: ReturnType<typeof getFeatureAccess> | null = null;

        // The reader journal belongs to the signed-in owner. Teacher/super-teacher
        // access to another user's Book Hub must not expose that user's private journal.
        if (ownerUserId === user.id) {
          let canUseJapaneseLearningJournal = false;
          let japaneseLearningArchiveTabs = emptyJapaneseLearningJournalArchiveTabs;

          if (isJapaneseBook && wantsJapaneseTools) {
            const access = getAppAccessStatus({
              role: isSuperTeacher ? "super_teacher" : profile.role,
              app_access_type: profile.app_access_type ?? null,
              app_access_expires_at: profile.app_access_expires_at ?? null,
            });
            const freeFeatures = await loadJapaneseLearningFreeFeatureFlags(supabase);
            featureAccess = getFeatureAccess({
              role: isSuperTeacher ? "super_teacher" : profile.role,
              isSuperTeacher: profile.is_super_teacher,
              hasFullAccess: access.hasFullAccess,
              isTrialActive: access.reason === "trial",
              freeFeatures,
            });
            canUseJapaneseLearningJournal = canUseActiveJapaneseLearningJournal({
              bookLanguageCode: book?.language_code ?? null,
              featureAccess,
            });
            if (!canUseJapaneseLearningJournal) {
              japaneseLearningArchiveTabs = await loadJapaneseLearningArchiveTabs(userBookId);
            }
          }

          if (!cancelled) {
            setJournalFavoriteQuotes(userBook.favorite_quotes ?? null);
            setJournalContext({
              userBookId,
              ownerUserId: user.id,
              bookLanguageCode: book?.language_code ?? null,
              pageCount: book?.page_count ?? null,
              canUseJapaneseLearningJournal,
              japaneseLearningArchiveTabs,
            });
          }
        }

        if (!isJapaneseBook) return;

        let canAccessBook = ownerUserId === user.id ||
          profile.role === "super_teacher" ||
          profile.is_super_teacher === true ||
          profile.is_super_teacher === "true";

        if (!canAccessBook && profile.role === "teacher" && ownerUserId) {
          const { data: teacherStudent, error } = await supabase
            .from("teacher_students")
            .select("teacher_id")
            .eq("teacher_id", user.id)
            .eq("student_id", ownerUserId)
            .is("archived_at", null)
            .maybeSingle();
          canAccessBook = !error && Boolean(teacherStudent);
        }
        if (!canAccessBook || !wantsJapaneseTools) return;

        if (!featureAccess) {
          const access = getAppAccessStatus({
            role: isSuperTeacher ? "super_teacher" : profile.role,
            app_access_type: profile.app_access_type ?? null,
            app_access_expires_at: profile.app_access_expires_at ?? null,
          });
          const freeFeatures = await loadJapaneseLearningFreeFeatureFlags(supabase);
          featureAccess = getFeatureAccess({
            role: isSuperTeacher ? "super_teacher" : profile.role,
            isSuperTeacher: profile.is_super_teacher,
            hasFullAccess: access.hasFullAccess,
            isTrialActive: access.reason === "trial",
            freeFeatures,
          });
        }

        if (!cancelled) {
          setCuriosityAvailable(canUseFullAccessFeature(featureAccess, "curiosity_reading"));
        }
      } catch (error) {
        console.error("Could not verify Curiosity Reading availability:", error);
      } finally {
        if (!cancelled) setCheckingCuriosityAccess(false);
      }
    }

    void checkCuriosityAvailability();
    return () => {
      cancelled = true;
    };
  }, [userBookId]);

  useEffect(() => {
    if (checkingCuriosityAccess || curiosityAvailable || mode !== "curiosity") return;
    setMode("fluid");
    router.replace(`/books/${encodeURIComponent(userBookId)}/read?mode=fluid`, { scroll: false });
  }, [checkingCuriosityAccess, curiosityAvailable, mode, router, userBookId]);

  useEffect(() => {
    void refreshSummary();
  }, [refreshSummary]);

  const onActiveTimerChange = useCallback((active: boolean) => {
    setCurrentTimerActive(active);
  }, []);

  function changeMode(nextMode: ReadingMode) {
    if (mode === nextMode) return;

    const persisted = readPersistedTimedSession(mode, userBookId);

    if (currentTimerActive || hasUnfinishedTimedSession(persisted)) {
      const confirmed = window.confirm(
        "A reading timer is active or unfinished. Switching modes will cancel it. Continue?"
      );
      if (!confirmed) return;
      clearPersistedTimedSession(mode, userBookId);
    }

    setCurrentTimerActive(false);
    setMode(nextMode);
    router.replace(`/books/${encodeURIComponent(userBookId)}/read?mode=${nextMode}`, { scroll: false });
  }

  const resumeLabel = progress.summaryData && progress.loaded
    ? readResumeCue(
        progress.summaryData.sessions,
        progress.method,
        progress.totals,
        progress.summaryData.currentLocation,
        progress.summaryData.words
      )
    : null;

  const activeJournalContext = journalContext?.userBookId === userBookId ? journalContext : null;
  const showJournal = journalOpen && Boolean(activeJournalContext);
  const hasJapaneseLearningJournal = Boolean(
    activeJournalContext?.canUseJapaneseLearningJournal ||
      (activeJournalContext && Object.values(activeJournalContext.japaneseLearningArchiveTabs).some(Boolean))
  );
  const journalPanel: ReactNode = activeJournalContext ? (
    <ReadingJournalPanel
      userBookId={userBookId}
      ownerUserId={activeJournalContext.ownerUserId}
      favoriteQuotes={journalFavoriteQuotes}
      bookLanguageCode={activeJournalContext.bookLanguageCode}
      pageCount={activeJournalContext.pageCount}
      currentPageNumber={journalPageContext.currentPageNumber}
      selectedChapterLabel={journalPageContext.selectedChapterLabel}
      selectedChapterNumber={journalPageContext.selectedChapterNumber}
      compact
      canUseJapaneseLearningJournal={activeJournalContext.canUseJapaneseLearningJournal}
      japaneseLearningArchiveTabs={activeJournalContext.japaneseLearningArchiveTabs}
      vocabListHref={hasJapaneseLearningJournal ? `/books/${encodeURIComponent(userBookId)}/words` : undefined}
      onFavoriteQuotesChange={setJournalFavoriteQuotes}
    />
  ) : null;

  if (mode === "curiosity" && checkingCuriosityAccess) {
    return (
      <main className="min-h-screen bg-stone-50 p-6">
        <div className="mx-auto max-w-3xl rounded-3xl border border-stone-200 bg-white p-6 text-stone-600 shadow-sm">
          Opening Curiosity Reading…
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-5 sm:px-6 sm:py-8">
      <div className={`mx-auto space-y-4 ${showJournal ? "max-w-[96rem]" : "max-w-5xl"}`}>
        <Link
          href={`/books/${encodeURIComponent(userBookId)}`}
          className="inline-flex text-sm font-semibold text-slate-500 hover:text-slate-900"
        >
          ← Back to Book Hub
        </Link>

        <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
          <h1 className="text-2xl font-black text-stone-950">Read</h1>
          {curiosityAvailable ? (
            <div className="mt-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-stone-500">Reading mode</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  aria-pressed={mode === "fluid"}
                  onClick={() => changeMode("fluid")}
                  className={`rounded-xl border p-3 text-left transition ${mode === "fluid" ? "border-emerald-500 bg-emerald-50" : "border-stone-200 bg-white hover:bg-stone-50"}`}
                >
                  <span className="block font-black text-stone-900">Fluid Reading</span>
                  <span className="mt-1 block text-sm text-stone-600">Read without stopping to save words.</span>
                </button>
                <button
                  type="button"
                  aria-pressed={mode === "curiosity"}
                  onClick={() => changeMode("curiosity")}
                  className={`rounded-xl border p-3 text-left transition ${mode === "curiosity" ? "border-violet-500 bg-violet-50" : "border-stone-200 bg-white hover:bg-stone-50"}`}
                >
                  <span className="block font-black text-stone-900">Curiosity Reading</span>
                  <span className="mt-1 block text-sm text-stone-600">Save words as you read.</span>
                </button>
              </div>
              <p className="mt-2 text-xs text-stone-500">Compare your pace between the two reading modes.</p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-stone-600">Fluid Reading</p>
          )}
          {activeJournalContext ? (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3">
              <span className="mr-1 text-xs font-black uppercase tracking-[0.14em] text-stone-500">Workspace</span>
              <button
                type="button"
                aria-pressed={!showJournal}
                onClick={() => setJournalOpen(false)}
                className={`rounded-full px-3 py-1.5 text-sm font-bold transition ${!showJournal ? "bg-stone-900 text-white" : "border border-stone-200 bg-white text-stone-700 hover:bg-stone-50"}`}
              >
                Read
              </button>
              <button
                type="button"
                aria-pressed={showJournal}
                onClick={() => setJournalOpen(true)}
                className={`rounded-full px-3 py-1.5 text-sm font-bold transition ${showJournal ? "bg-violet-700 text-white" : "border border-stone-200 bg-white text-stone-700 hover:bg-stone-50"}`}
              >
                Read + Journal
              </button>
            </div>
          ) : null}
        </section>

        <div className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-700 shadow-sm" role="status">
          <span className="font-semibold text-stone-900">Where did I leave off?</span>{" "}
          {resumeLabel ?? "No saved reading position yet."}
        </div>

        {mode === "curiosity" && curiosityAvailable ? (
          <CuriosityReadingExperience
            experienceMode="curiosity"
            embedded
            workspaceCompact
            workspaceAside={showJournal ? journalPanel : undefined}
            onCloseWorkspaceAside={() => setJournalOpen(false)}
            showProgressSummaryBar={false}
            onActiveTimerChange={onActiveTimerChange}
            onReadingJournalContextChange={setJournalPageContext}
          />
        ) : (
          <div className={showJournal ? "grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(24rem,30rem)]" : "min-w-0"}>
            <div className={showJournal ? "hidden min-w-0 md:block" : "min-w-0"}>
              <SimpleTimedSessionPage
                sessionMode="fluid"
                embedded
                workspaceCompact
                showFluidReadingExplanation
                eyebrow="Fluid Reading"
                title="Fluid Reading"
                subtitle="Timer-only fluid reading"
                description="Read without saved-word support or new lookups. Let the timer keep you company and stay with the story."
                saveSuccessMessage="Your fluid reading session has been saved in Reading History."
                showProgressSummaryBar={false}
                onActiveTimerChange={onActiveTimerChange}
              />
            </div>
            {showJournal && journalPanel ? (
              <aside className="fixed inset-0 z-50 overflow-y-auto bg-stone-50 p-4 md:static md:max-h-[calc(100vh-2rem)] md:rounded-[2rem] md:border md:border-violet-200 md:bg-white md:p-3 md:shadow-sm">
                <button type="button" onClick={() => setJournalOpen(false)} className="mb-3 rounded-xl bg-stone-900 px-4 py-2 text-sm font-bold text-white md:hidden">
                  ← Back to reading
                </button>
                {journalPanel}
              </aside>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}
