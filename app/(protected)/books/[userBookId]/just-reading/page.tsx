// Fluid Reading - Just Reading
//

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getAppAccessStatus, isMissingAppAccessColumnError } from "@/lib/access/appAccess";
import { getFeatureAccess } from "@/lib/access/featureAccess";
import { supabase } from "@/lib/supabaseClient";
import ReadingJournalPanel from "../components/ReadingJournalPanel";
import SimpleTimedSessionPage from "../_shared/timed-session/SimpleTimedSessionPage";

type JustReadingViewMode = "just-reading" | "workspace";
type ProfileRole = "teacher" | "member" | "student" | "super_teacher" | "admin";

function isSuperTeacherFlag(value: unknown) {
    return value === true || value === "true";
}

export default function JustReadingPage() {
    const params = useParams<{ userBookId: string }>();
    const userBookId = params.userBookId;
    const [checkingAccess, setCheckingAccess] = useState(true);
    const [canUseReadingJournal, setCanUseReadingJournal] = useState(false);
    const [journalOwnerUserId, setJournalOwnerUserId] = useState<string | null>(null);
    const [favoriteQuotes, setFavoriteQuotes] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<JustReadingViewMode>("just-reading");

    useEffect(() => {
        let cancelled = false;

        async function loadReadingWorkspaceAccess() {
            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            if (cancelled) return;

            if (userError || !user || !userBookId) {
                setCheckingAccess(false);
                return;
            }

            const { data: userBook, error: userBookError } = await supabase
                .from("user_books")
                .select("id, user_id, favorite_quotes")
                .eq("id", userBookId)
                .maybeSingle();

            if (cancelled) return;

            if (userBookError || !userBook) {
                if (userBookError) {
                    console.error("Error loading Just Reading workspace access:", userBookError);
                }
                setCanUseReadingJournal(false);
                setJournalOwnerUserId(null);
                setFavoriteQuotes(null);
                setCheckingAccess(false);
                return;
            }

            const profileResult = await supabase
                .from("profiles")
                .select("role, is_super_teacher, app_access_type, app_access_expires_at, trial_started_at, trial_ends_at")
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
                    .limit(1)
                    .maybeSingle();

                if (teacherStudentError) {
                    console.error("Error checking Just Reading workspace teacher access:", teacherStudentError);
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

                setCanUseReadingJournal(Boolean(canAccessBook && ownerUserId && featureAccess.canUseStoryNotes));
                setJournalOwnerUserId(canAccessBook ? ownerUserId : null);
                setFavoriteQuotes(canAccessBook ? ((userBook as any).favorite_quotes ?? null) : null);
            } else {
                setCanUseReadingJournal(false);
                setJournalOwnerUserId(null);
                setFavoriteQuotes(null);
            }

            setCheckingAccess(false);
        }

        void loadReadingWorkspaceAccess();

        return () => {
            cancelled = true;
        };
    }, [userBookId]);

    useEffect(() => {
        if (!canUseReadingJournal && viewMode === "workspace") {
            setViewMode("just-reading");
        }
    }, [canUseReadingJournal, viewMode]);

    const standaloneTimer = (
        <SimpleTimedSessionPage
            sessionMode="fluid"
            eyebrow="Fluid Reading"
            title="Extensive · Just Reading"
            subtitle="Timer-only fluid reading"
            description="Read without saved-word support or new lookups. Let the timer keep you company and stay with the story."
            saveSuccessMessage="Your fluid reading session has been saved in Reading Sessions."
        />
    );

    if (checkingAccess || !canUseReadingJournal || !journalOwnerUserId) {
        return standaloneTimer;
    }

    const showReadingWorkspace = viewMode === "workspace";
    const timedSession = (
        <SimpleTimedSessionPage
            sessionMode="fluid"
            eyebrow="Fluid Reading"
            title="Extensive · Just Reading"
            subtitle="Timer-only fluid reading"
            description="Read without saved-word support or new lookups. Let the timer keep you company and stay with the story."
            saveSuccessMessage="Your fluid reading session has been saved in Reading Sessions."
            embedded
            workspaceCompact={showReadingWorkspace}
        />
    );

    return (
        <main className="min-h-screen bg-stone-50 p-6">
            <div
                className={[
                    "mx-auto space-y-4",
                    showReadingWorkspace ? "max-w-[96rem]" : "max-w-4xl",
                ].join(" ")}
            >
                <div className="hidden justify-end lg:flex">
                    <div className="inline-flex rounded-2xl border border-stone-200 bg-white p-1 shadow-sm">
                        <button
                            type="button"
                            onClick={() => setViewMode("just-reading")}
                            className={`rounded-xl px-4 py-2 text-sm font-black transition ${
                                viewMode === "just-reading"
                                    ? "bg-stone-900 text-white"
                                    : "text-stone-600 hover:bg-stone-50"
                            }`}
                        >
                            Just Reading
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

                <div
                    className={
                        showReadingWorkspace
                            ? "space-y-4 lg:grid lg:grid-cols-[minmax(24rem,30rem)_minmax(0,1fr)] lg:items-start lg:gap-4 lg:space-y-0 xl:grid-cols-[minmax(26rem,32rem)_minmax(0,1fr)]"
                            : "space-y-4"
                    }
                >
                    <div className="min-w-0">{timedSession}</div>
                    {showReadingWorkspace ? (
                        <div className="hidden min-w-0 lg:block">
                            <ReadingJournalPanel
                                userBookId={userBookId}
                                ownerUserId={journalOwnerUserId}
                                favoriteQuotes={favoriteQuotes}
                                compact
                                onFavoriteQuotesChange={setFavoriteQuotes}
                            />
                        </div>
                    ) : null}
                </div>
            </div>
        </main>
    );
}
