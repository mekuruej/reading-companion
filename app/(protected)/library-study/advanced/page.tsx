"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import VocabularyGrowthCycleSection from "./components/VocabularyGrowthCycleSection";
import { getAppAccessStatus, isMissingAppAccessColumnError } from "@/lib/access/appAccess";
import { getFeatureAccess } from "@/lib/access/featureAccess";
import {
    calculateAdvancedStudyReadiness,
    type AdvancedStudyReadinessProgressRow,
    type AdvancedStudyReadinessResult,
    type AdvancedStudyReadinessSummaryRow,
} from "@/lib/study/advancedStudyReadiness";
import { supabase } from "@/lib/supabaseClient";

type ProfileAccessRow = {
    role: string | null;
    is_super_teacher: boolean | null;
    app_access_type: string | null;
    app_access_expires_at: string | null;
    trial_started_at: string | null;
    trial_ends_at: string | null;
};

type LearningSettingsRow = {
    red_stages: number | null;
    orange_stages: number | null;
    yellow_stages: number | null;
};

const DEFAULT_LEARNING_SETTINGS: LearningSettingsRow = {
    red_stages: 1,
    orange_stages: 1,
    yellow_stages: 1,
};

function formatReadyScore(value: number) {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

const advancedTools = [
    {
        title: "Ability Check",
        href: "/library-study/check",
        eyebrow: "Smart gates",
        className: "border-emerald-200 bg-emerald-50 text-emerald-950",
    },
    {
        title: "Library Review",
        href: "/library-study/practice",
        eyebrow: "Across books",
        className: "border-sky-200 bg-sky-50 text-sky-950",
    },
    {
        title: "Word Sky",
        href: "/library-study/word-sky",
        eyebrow: "Word growth",
        className: "border-violet-200 bg-violet-50 text-violet-950",
    },
];

export default function AdvancedStudyPage() {
    const [loadingAccess, setLoadingAccess] = useState(true);
    const [canUseAdvancedStudy, setCanUseAdvancedStudy] = useState(false);
    const [accessReason, setAccessReason] = useState<string>("free");
    const [hasSavedWords, setHasSavedWords] = useState(false);
    const [readiness, setReadiness] = useState<AdvancedStudyReadinessResult | null>(null);
    const [readinessLoading, setReadinessLoading] = useState(false);
    const [readinessError, setReadinessError] = useState<string | null>(null);
    const [isTrialAccess, setIsTrialAccess] = useState(false);
    const [isStaffAccess, setIsStaffAccess] = useState(false);
    const [canUseAbilityCheck, setCanUseAbilityCheck] = useState(false);
    const [canUseLibraryReview, setCanUseLibraryReview] = useState(false);
    const accessTitle = accessReason === "expired" ? "Reading Access ended" : "Free reading tracker";
    const abilityCheckAvailable = canUseAbilityCheck && !isTrialAccess && (isStaffAccess || (readiness?.abilityCheckReady ?? false));
    const libraryReviewAvailable = canUseLibraryReview && !isTrialAccess && (isStaffAccess || (readiness?.libraryReviewReady ?? false));
    const showAdvancedTools = canUseAdvancedStudy && !isTrialAccess && (
        isStaffAccess ||
        abilityCheckAvailable ||
        libraryReviewAvailable
    );

    useEffect(() => {
        let mounted = true;

        const loadAccess = async () => {
            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser();

                if (!user) {
                    if (mounted) {
                        setCanUseAdvancedStudy(false);
                        setAccessReason("free");
                        setHasSavedWords(false);
                        setReadiness(null);
                        setReadinessError(null);
                        setIsTrialAccess(false);
                        setIsStaffAccess(false);
                        setCanUseAbilityCheck(false);
                        setCanUseLibraryReview(false);
                        setLoadingAccess(false);
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
                    : { hasFullAccess: false, reason: "free" as const };
                const staffAccess = appStatus.reason === "staff";
                const trialAccess = appStatus.reason === "trial";
                const featureAccess = getFeatureAccess({
                    role: profile?.role,
                    isSuperTeacher: profile?.is_super_teacher,
                    hasFullAccess: appStatus.hasFullAccess,
                    isTrialActive: appStatus.reason === "trial",
                });

                if (mounted) {
                    setCanUseAdvancedStudy(featureAccess.canUseAdvancedStudy);
                    setAccessReason(appStatus.reason);
                    setIsTrialAccess(trialAccess);
                    setIsStaffAccess(staffAccess);
                    setCanUseAbilityCheck(featureAccess.canUseAbilityCheck);
                    setCanUseLibraryReview(featureAccess.canUseLibraryReview);
                    setLoadingAccess(false);
                }

                if (featureAccess.canUseAdvancedStudy) {
                    if (mounted) {
                        setReadinessLoading(true);
                        setReadinessError(null);
                    }

                    const { data: settingsRow, error: settingsError } = await supabase
                        .from("user_learning_settings")
                        .select("red_stages, orange_stages, yellow_stages")
                        .eq("user_id", user.id)
                        .maybeSingle<LearningSettingsRow>();

                    if (settingsError) {
                        console.warn("Advanced Study readiness is using default settings:", settingsError);
                    }

                    const { data: summaryRows, error: summaryError } = await supabase
                        .from("user_library_word_summaries")
                        .select("study_identity_key, surface, reading, meaning, total_encounter_count, hidden_encounter_count")
                        .eq("user_id", user.id)
                        .limit(5000)
                        .returns<AdvancedStudyReadinessSummaryRow[]>();

                    if (summaryError) {
                        throw summaryError;
                    }

                    const { data: progressRows, error: progressError } = await supabase
                        .from("user_library_word_progress")
                        .select("study_identity_key, reading_gate_status, meaning_gate_status, held_before_reading_gate, held_before_meaning_gate, reading_gate_attempts, mastered")
                        .eq("user_id", user.id)
                        .eq("definition_key", "")
                        .limit(20000)
                        .returns<AdvancedStudyReadinessProgressRow[]>();

                    if (progressError) {
                        console.warn("Advanced Study readiness is using summary colors without progress:", progressError);
                    }

                    const nextReadiness = calculateAdvancedStudyReadiness({
                        summaries: summaryRows ?? [],
                        progressRows: progressError ? [] : progressRows ?? [],
                        settings: {
                            ...DEFAULT_LEARNING_SETTINGS,
                            ...(settingsError ? {} : settingsRow ?? {}),
                        },
                    });

                    if (mounted) {
                        setReadiness(nextReadiness);
                        setReadinessLoading(false);
                    }
                }

                const { data: savedWordRows, error: savedWordError } = await supabase
                    .from("user_book_words")
                    .select("id")
                    .limit(1);

                if (savedWordError) {
                    console.error("Failed to check saved vocabulary", savedWordError);
                    if (mounted) setHasSavedWords(false);
                } else if (mounted) {
                    setHasSavedWords((savedWordRows ?? []).length > 0);
                }
            } catch (error) {
                console.error("Failed to load study access", error);
                if (mounted) {
                    setCanUseAdvancedStudy(false);
                    setAccessReason("free");
                    setHasSavedWords(false);
                    setReadiness(null);
                    setReadinessLoading(false);
                    setReadinessError("Could not load Advanced Study readiness.");
                    setIsTrialAccess(false);
                    setIsStaffAccess(false);
                    setCanUseAbilityCheck(false);
                    setCanUseLibraryReview(false);
                    setLoadingAccess(false);
                }
            }
        };

        loadAccess();

        return () => {
            mounted = false;
        };
    }, []);

    return (
        <main className="min-h-screen bg-slate-100 px-5 py-8">
            <div className="mx-auto max-w-5xl">
                <div className="mb-8 text-center">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                        Advanced Study
                    </p>

                    <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
                        Mekuru Vocabulary Growth Cycle
                    </h1>

                    <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                        Save words while reading, study them in different ways, and meet them
                        again until they become easier to notice in real books.
                    </p>
                </div>

                {loadingAccess ? (
                    <section className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                        <p className="text-sm font-semibold text-slate-600">
                            Loading reading access...
                        </p>
                    </section>
                ) : !canUseAdvancedStudy ? (
                    <section className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                            {accessTitle}
                        </p>
                        <h2 className="mt-2 text-2xl font-black text-slate-950">
                            Keep your reading archive simple
                        </h2>
                        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                            Advanced vocabulary study is part of Reading Access. You can still
                            track books, log reading time, and view basic stats{hasSavedWords ? ", plus open your saved vocabulary as a read-only archive with CSV export" : ""}.
                        </p>
                        <div className="mt-5 flex flex-wrap gap-3">
                            <Link
                                href="/books"
                                className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-800"
                            >
                                My Library
                            </Link>
                            {hasSavedWords ? (
                                <Link
                                    href="/library/vocab-list-index"
                                    className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                                >
                                    Vocabulary Archive
                                </Link>
                            ) : null}
                        </div>
                    </section>
                ) : (
                    <>
                        {readinessLoading ? (
                            <section className="rounded-3xl border border-slate-200 bg-white p-5 text-center text-sm font-semibold text-slate-600 shadow-sm">
                                Loading Advanced Study readiness...
                            </section>
                        ) : readinessError ? (
                            <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold leading-6 text-amber-950 shadow-sm">
                                Advanced Study readiness could not load right now. Your saved words and colors are still here.
                            </section>
                        ) : readiness ? (
                            <section className="rounded-3xl border border-violet-200 bg-white p-6 text-slate-900 shadow-sm">
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
                                    {showAdvancedTools ? "Advanced Study is available" : "Advanced Study is forming"}
                                </p>
                                <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-950">
                                            {showAdvancedTools
                                                ? "Advanced Study is available."
                                                : `${readiness.eligibleWordCount} / ${readiness.abilityCheckTarget} tracked words for Ability Check`}
                                        </h2>
                                        <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
                                            {showAdvancedTools
                                                ? `You have ${readiness.eligibleWordCount} tracked words. ${formatReadyScore(readiness.readyScore)} words are strongly marked by color, which helps show the shape of your review pool.`
                                                : isTrialAccess
                                                    ? "During your trial, your word colors can begin while you build vocabulary from books. Ability Check and Library Review are part of paid Advanced Study."
                                                : "Add more words from your books to make Ability Check and Library Review more useful. Your word colors can already begin before Advanced Study is fully useful."}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">
                                        {readiness.eligibleWordCount} tracked word{readiness.eligibleWordCount === 1 ? "" : "s"}
                                    </div>
                                </div>

                                <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
                                    <div
                                        className="h-full rounded-full bg-violet-500"
                                        style={{
                                            width: `${Math.min(100, (readiness.eligibleWordCount / readiness.abilityCheckTarget) * 100)}%`,
                                        }}
                                    />
                                </div>

                                <p className="mt-4 text-sm font-semibold leading-6 text-slate-600">
                                    {libraryReviewAvailable
                                        ? `Library Review is available. You have ${readiness.eligibleWordCount} tracked words, and ${formatReadyScore(readiness.readyScore)} are strongly marked by color.`
                                        : isTrialAccess
                                            ? `Library Review is part of paid Advanced Study. Your color-marked review pool is ${formatReadyScore(readiness.readyScore)} strongly marked words.`
                                            : `Library Review becomes more useful around ${readiness.libraryReviewTarget} tracked words. You have ${readiness.eligibleWordCount} / ${readiness.libraryReviewTarget}.`}
                                </p>

                                <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm font-semibold leading-6 text-violet-950">
                                    Color-marked review pool: {formatReadyScore(readiness.readyScore)} strongly marked word{readiness.readyScore === 1 ? "" : "s"}.
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
                                    <span className="rounded-full bg-red-50 px-3 py-1.5 text-red-700">Red {readiness.colorCounts.red}</span>
                                    <span className="rounded-full bg-orange-50 px-3 py-1.5 text-orange-800">Orange {readiness.colorCounts.orange}</span>
                                    <span className="rounded-full bg-yellow-100 px-3 py-1.5 text-amber-900">Yellow {readiness.colorCounts.yellow}</span>
                                    <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-800">Green {readiness.colorCounts.green}</span>
                                    <span className="rounded-full bg-sky-50 px-3 py-1.5 text-sky-800">Blue {readiness.colorCounts.blue}</span>
                                    <span className="rounded-full bg-violet-50 px-3 py-1.5 text-violet-800">Purple {readiness.colorCounts.purple}</span>
                                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-600">Grey {readiness.colorCounts.grey}</span>
                                </div>

                                {!showAdvancedTools ? (
                                    <div className="mt-5 flex flex-wrap gap-3">
                                        <Link
                                            href="/library-study/book-study"
                                            className="rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-black text-indigo-950 transition hover:bg-indigo-100"
                                        >
                                            Book Study
                                        </Link>
                                        <Link
                                            href="/library-study/word-sky"
                                            className="rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-black text-violet-950 transition hover:bg-violet-100"
                                        >
                                            Word Sky warm-up
                                        </Link>
                                    </div>
                                ) : null}
                            </section>
                        ) : null}

                        <details className="group rounded-3xl border border-sky-200 bg-white p-6 text-slate-900 shadow-sm">
                            <summary className="cursor-pointer list-none">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-600">
                                            Mekuru Vocabulary Philosophy
                                        </p>

                                        <h2 className="mt-2 text-2xl font-black text-slate-950">
                                            Noticing, not cramming
                                        </h2>
                                    </div>

                                    <span className="shrink-0 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-black text-sky-700">
                                        <span className="group-open:hidden">Open</span>
                                        <span className="hidden group-open:inline">Close</span>
                                    </span>
                                </div>
                            </summary>

                            <div className="mt-5 border-t border-slate-200 pt-5">
                                <p className="text-sm leading-7 text-slate-700">
                                    Mekuru’s goal is to support natural learning through native
                                    material. Advanced vocabulary study is built around noticing:
                                    meeting a word in real reading, seeing it again in a focused
                                    study moment, checking it lightly, and then returning it to books
                                    so recognition can grow.
                                </p>

                                <p className="mt-3 text-sm leading-7 text-slate-700">
                                    The goal is not to force a word into memory all at once. The goal
                                    is to give each word enough useful encounters that the next time
                                    you see it in a book, it has a better chance of feeling familiar.
                                </p>

                                <p className="mt-3 text-sm leading-7 text-slate-700">
                                    Advanced Study applies this idea across your saved words with
                                    Library Review, Ability Check, Word Sky, and color movement.
                                    The colors are not grades; they are gentle signals for where a
                                    word is in its noticing cycle.
                                </p>
                            </div>
                        </details>

                        {showAdvancedTools ? (
                        <section className="mt-4">
                            <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                                Quick study jumps
                            </p>

                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {advancedTools.filter((tool) => {
                                    if (isStaffAccess) return true;
                                    if (tool.title === "Ability Check") return abilityCheckAvailable;
                                    if (tool.title === "Library Review") return libraryReviewAvailable;
                                    return true;
                                }).map((tool) => (
                                    <Link
                                        key={tool.href}
                                        href={tool.href}
                                        className={`group rounded-2xl border px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${tool.className}`}
                                    >
                                        <div className="text-[10px] font-black uppercase tracking-[0.16em] opacity-60">
                                            {tool.eyebrow}
                                        </div>

                                        <div className="mt-2 flex items-center justify-between gap-3">
                                            <h3 className="min-w-0 text-base font-black leading-tight">
                                                {tool.title}
                                            </h3>

                                            <span className="shrink-0 rounded-full bg-white/80 px-2.5 py-1 text-xs font-black shadow-sm transition group-hover:bg-white">
                                                →
                                            </span>
                                        </div>
                                    </Link>
                                ))}
                            </div>

                            <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold leading-6 text-emerald-950">
                                Book-specific flashcards live in Book Study. These tools work across your library.
                            </p>
                        </section>
                        ) : null}

                        <VocabularyGrowthCycleSection />

                        <details className="group mt-6 rounded-3xl border border-sky-200 bg-white p-6 text-slate-900 shadow-sm">
                            <summary className="cursor-pointer list-none">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-600">
                                            Reading Colors
                                        </p>
                                        <h2 className="mt-2 text-2xl font-black text-slate-950">
                                            What do the colors mean?
                                        </h2>

                                        <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold leading-6 text-amber-950">
                                            Colors ebb and flow with your encounters and skill, matching your changing relationship with each word.
                                        </p>
                                    </div>

                                    <span className="shrink-0 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-black text-sky-700">
                                        <span className="group-open:hidden">Open</span>
                                        <span className="hidden group-open:inline">Close</span>
                                    </span>
                                </div>
                            </summary>

                    <div className="mt-5 border-t border-slate-200 pt-5">
                        <p className="text-sm leading-7 text-slate-700">
                            Mekuru uses colors to help you notice words, track movement, and separate real
                            reading encounters from Ability Check gates.
                        </p>

                        <p className="mt-3 text-sm leading-7 text-slate-700">
                            Some colors come from reading encounters. These show that you have met the word
                            in real reading and are building support before a gate check.
                        </p>

                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-black text-white">
                                    Red
                                </span>
                                <h3 className="mt-3 font-black text-slate-950">
                                    Early encounter support
                                </h3>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    You have started meeting this word in real reading, but it is still new.
                                    No need to force it yet.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-black text-white">
                                    Orange
                                </span>
                                <h3 className="mt-3 font-black text-slate-950">
                                    Repeated encounter support
                                </h3>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    This word has appeared again, but Mekuru is still building reading support.
                                    Just keep noticing it when it appears.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <span className="rounded-full bg-yellow-300 px-3 py-1 text-xs font-black text-slate-950">
                                    Yellow
                                </span>
                                <h3 className="mt-3 font-black text-slate-950">
                                    Ready for gate checks
                                </h3>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    This word has enough reading support for a gate check.
                                    Look for the Ability Check alert on your Library page.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-3">
                                <div className="flex flex-wrap gap-2">
                                    <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-black text-white">
                                        Red 2
                                    </span>
                                    <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-black text-white">
                                        Orange 2
                                    </span>
                                    <span className="rounded-full bg-yellow-300 px-3 py-1 text-xs font-black text-slate-950">
                                        Yellow 2
                                    </span>
                                </div>

                                <h3 className="mt-4 text-base font-black text-slate-950">
                                    Extra reading support
                                </h3>

                                <p className="mt-2 text-sm leading-7 text-slate-700">
                                    If Yellow still feels too hard, Mekuru can wait before asking again. Red 2,
                                    Orange 2, and Yellow 2 mean the word is getting another round of real
                                    reading support before returning to Ability Check.
                                </p>
                            </div>
                        </div>

                        <p className="mt-5 text-sm leading-7 text-slate-700">
                            Other colors come from Ability Check. These show whether the word
                            has passed a reading or meaning gate.
                        </p>

                        <div className="mt-4 grid gap-3 md:grid-cols-4">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <span className="rounded-full bg-green-500 px-3 py-1 text-xs font-black text-white">
                                    Green
                                </span>
                                <h3 className="mt-3 font-black text-slate-950">
                                    Reading Gate
                                </h3>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    The word is ready for a reading question in Ability Check.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-black text-white">
                                    Blue
                                </span>
                                <h3 className="mt-3 font-black text-slate-950">
                                    Meaning Gate
                                </h3>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    The reading is supported, and the word is ready for a meaning
                                    question.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <span className="rounded-full bg-purple-600 px-3 py-1 text-xs font-black text-white">
                                    Purple
                                </span>
                                <h3 className="mt-3 font-black text-slate-950">
                                    Mastered
                                </h3>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    The word has cleared the major gates and no longer needs
                                    regular attention.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <span className="rounded-full bg-slate-500 px-3 py-1 text-xs font-black text-white">
                                    Limbo
                                </span>
                                <h3 className="mt-3 font-black text-slate-950">
                                    Between gates
                                </h3>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    The word is between Ability Check gates and may need another
                                    look before moving forward.
                                </p>
                            </div>
                        </div>

                        <p className="mt-5 text-sm leading-7 text-slate-700">
                            The colors are not grades. They are movement signals. They help
                            you notice which words need support, which words are ready to be
                            checked, and which words can quietly return to real reading.
                        </p>
                    </div>
                        </details>
                    </>
                )}

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
