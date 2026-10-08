"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useBookProgress } from "@/components/books/BookProgressProvider";
import { getAppAccessStatus, isMissingAppAccessColumnError } from "@/lib/access/appAccess";
import { canUseFullAccessFeature } from "@/lib/access/requireFullAccess";
import { getFeatureAccess } from "@/lib/access/featureAccess";
import { isJapaneseLearningBook } from "@/lib/access/readingCompanion";
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
import { supabase } from "@/lib/supabaseClient";

type ReadingMode = "fluid" | "curiosity";

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

  useEffect(() => {
    let cancelled = false;

    async function checkCuriosityAvailability() {
      setCheckingCuriosityAccess(true);
      setCuriosityAvailable(false);

      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user?.id || !userBookId) return;

        const [{ data: userBook, error: userBookError }, profileResult] = await Promise.all([
          supabase
            .from("user_books")
            .select("user_id, books(language_code)")
            .eq("id", userBookId)
            .maybeSingle(),
          supabase
            .from("profiles")
            .select("role, is_super_teacher, target_language, japanese_learning_enabled, app_access_type, app_access_expires_at")
            .eq("id", user.id)
            .maybeSingle(),
        ]);

        if (userBookError || !userBook) return;

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
        if (profileError || !profile) return;

        const book = Array.isArray(userBook.books) ? userBook.books[0] : userBook.books;
        if (!isJapaneseLearningBook(book?.language_code ?? null)) return;

        const ownerUserId = userBook.user_id;
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
        if (!canAccessBook || !wantsJapaneseLearning(profile)) return;

        const isSuperTeacher = profile.role === "super_teacher" ||
          profile.is_super_teacher === true ||
          profile.is_super_teacher === "true";
        const access = getAppAccessStatus({
          role: isSuperTeacher ? "super_teacher" : profile.role,
          app_access_type: profile.app_access_type ?? null,
          app_access_expires_at: profile.app_access_expires_at ?? null,
        });
        const freeFeatures = await loadJapaneseLearningFreeFeatureFlags(supabase);
        const featureAccess = getFeatureAccess({
          role: isSuperTeacher ? "super_teacher" : profile.role,
          isSuperTeacher: profile.is_super_teacher,
          hasFullAccess: access.hasFullAccess,
          isTrialActive: access.reason === "trial",
          freeFeatures,
        });

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
      <div className="mx-auto max-w-5xl space-y-4">
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
            showProgressSummaryBar={false}
            onActiveTimerChange={onActiveTimerChange}
          />
        ) : (
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
        )}
      </div>
    </main>
  );
}
