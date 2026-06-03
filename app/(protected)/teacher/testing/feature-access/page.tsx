// Feature Access Test Page
//
// Internal super-teacher-only page for checking Mekuru's access helpers.
// This page reads the current logged-in user's real profile and shows what
// the app currently thinks they can use.

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getAppAccessStatus } from "@/lib/access/appAccess";
import { getFeatureAccess } from "@/lib/access/featureAccess";
import {
    canUseFullAccessFeature,
    getFullAccessFeatureLabel,
    type FullAccessFeature,
} from "@/lib/access/requireFullAccess";
import { supabase } from "@/lib/supabaseClient";

type ProfileRow = {
    role: string | null;
    is_super_teacher: boolean | null;
    app_access_type: string | null;
    app_access_expires_at: string | null;
};

type CurrentUserInfo = {
    id: string;
    email: string | null;
};

const FULL_ACCESS_FEATURES: {
    key: FullAccessFeature;
    label: string;
    note: string;
}[] = [
        {
            key: "add_word",
            label: "Add Word",
            note: "Saving vocabulary from the single Add Word page.",
        },
        {
            key: "curiosity_reading",
            label: "Curiosity Reading",
            note: "Reading while looking up and saving words.",
        },
        {
            key: "saved_word_reading",
            label: "Fluid Reading with saved-word support",
            note: "Reading with saved vocabulary support.",
        },
        {
            key: "vocabulary_list",
            label: "Vocabulary List",
            note: "Viewing and managing saved book vocabulary.",
        },
        {
            key: "study_flashcards",
            label: "Study Flashcards",
            note: "Book-specific study flashcards.",
        },
        {
            key: "ability_check",
            label: "Ability Check",
            note: "Library-wide saved-word color/gate checks.",
        },
        {
            key: "vocab_tools",
            label: "Vocab Tools",
            note: "Book vocabulary tools tab.",
        },
        {
            key: "story_notes",
            label: "Story Notes",
            note: "Private story/book notes.",
        },
        {
            key: "vocabulary_stats",
            label: "Vocabulary Stats",
            note: "Saved-word statistics.",
        },
        {
            key: "reading_colors",
            label: "Reading Colors",
            note: "Library Study color progress.",
        },
    ];

const SIMULATED_ACCESS_SCENARIOS = [
    {
        label: "Free learner",
        description: "Can enter Mekuru, but does not have full vocabulary/study access.",
        role: "student",
        hasFullAccess: false,
    },
    {
        label: "Full-access learner",
        description: "Current trial/paid/book-club style access.",
        role: "student",
        hasFullAccess: true,
    },
    {
        label: "Expired trial treated as free",
        description: "Future goal: user can still enter free areas, but full-access features lock.",
        role: "student",
        hasFullAccess: false,
    },
    {
        label: "Teacher",
        description: "Teacher/staff access should stay open.",
        role: "teacher",
        hasFullAccess: true,
    },
    {
        label: "Super teacher",
        description: "Super-teacher access should stay open.",
        role: "super_teacher",
        hasFullAccess: true,
    },
];

function StatusPill({ allowed }: { allowed: boolean }) {
    return (
        <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${allowed
                ? "bg-emerald-100 text-emerald-900"
                : "bg-rose-100 text-rose-900"
                }`}
        >
            {allowed ? "Allowed" : "Locked"}
        </span>
    );
}

function DetailRow({
    label,
    value,
}: {
    label: string;
    value: string | null | undefined;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                {label}
            </div>
            <div className="mt-1 break-words text-sm font-semibold text-slate-900">
                {value || "—"}
            </div>
        </div>
    );
}

export default function FeatureAccessTestPage() {
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<CurrentUserInfo | null>(null);
    const [profile, setProfile] = useState<ProfileRow | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        async function loadAccessInfo() {
            setLoading(true);
            setErrorMsg(null);

            const {
                data: { user },
                error: authErr,
            } = await supabase.auth.getUser();

            if (authErr || !user?.id) {
                setCurrentUser(null);
                setProfile(null);
                setErrorMsg("You need to sign in to use the testing area.");
                setLoading(false);
                return;
            }

            setCurrentUser({
                id: user.id,
                email: user.email ?? null,
            });

            const { data, error } = await supabase
                .from("profiles")
                .select("role, is_super_teacher, app_access_type, app_access_expires_at")
                .eq("id", user.id)
                .maybeSingle<ProfileRow>();

            if (error) {
                setProfile(null);
                setErrorMsg(error.message || "Could not load profile access info.");
                setLoading(false);
                return;
            }

            setProfile(data ?? null);
            setLoading(false);
        }

        void loadAccessInfo();
    }, []);

    const isTestingAllowed =
        profile?.role === "super_teacher" ||
        profile?.is_super_teacher === true ||
        profile?.role === "admin";

    const roleForAccess = profile?.is_super_teacher
        ? "super_teacher"
        : profile?.role ?? null;

    const appAccessStatus = useMemo(() => {
        if (!profile) return null;

        return getAppAccessStatus({
            role: roleForAccess,
            app_access_type: profile.app_access_type,
            app_access_expires_at: profile.app_access_expires_at,
        });
    }, [profile, roleForAccess]);

    const featureAccess = useMemo(() => {
        if (!appAccessStatus) return null;

        return getFeatureAccess({
            role: roleForAccess,
            hasFullAccess: appAccessStatus.hasFullAccess,
        });
    }, [appAccessStatus, roleForAccess]);

    if (loading) {
        return (
            <main className="min-h-screen bg-slate-100 px-6 py-8">
                <div className="mx-auto max-w-5xl text-sm text-slate-500">
                    Loading feature access...
                </div>
            </main>
        );
    }

    if (errorMsg) {
        return (
            <main className="min-h-screen bg-slate-100 px-6 py-8">
                <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                        Feature Access Test
                    </p>
                    <h1 className="mt-2 text-2xl font-black text-slate-950">
                        Could not load access info
                    </h1>
                    <p className="mt-3 text-sm leading-6 text-rose-700">{errorMsg}</p>
                </div>
            </main>
        );
    }

    if (!isTestingAllowed) {
        return (
            <main className="min-h-screen bg-slate-100 px-6 py-8">
                <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                        Feature Access Test
                    </p>
                    <h1 className="mt-2 text-2xl font-black text-slate-950">
                        Super-teacher access needed
                    </h1>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                        This page shows internal access information and is only for Mekuru testing.
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-100 px-6 py-8">
            <div className="mx-auto max-w-5xl">
                <div className="mb-4">
                    <Link
                        href="/teacher/testing"
                        className="text-sm font-semibold text-slate-600 underline-offset-4 hover:text-slate-950 hover:underline"
                    >
                        ← Back to Testing Tools
                    </Link>
                </div>

                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                        Mekuru Test Lab
                    </p>

                    <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                            <h1 className="text-3xl font-black text-slate-950">
                                Feature Access Test
                            </h1>
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                                This page shows what the current access helpers think this account can use.
                                It does not change the database or unlock anything by itself.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                            <div className="font-black text-slate-900">
                                App access: {appAccessStatus?.hasAccess ? "Allowed" : "Locked"}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                                Reason: {appAccessStatus?.reason ?? "unknown"}
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-3 md:grid-cols-2">
                        <DetailRow label="User ID" value={currentUser?.id} />
                        <DetailRow label="Email" value={currentUser?.email} />
                        <DetailRow label="Role" value={profile?.role} />
                        <DetailRow
                            label="Role used for feature access"
                            value={roleForAccess}
                        />
                        <DetailRow
                            label="Is super teacher"
                            value={String(profile?.is_super_teacher ?? false)}
                        />
                        <DetailRow
                            label="App access type"
                            value={profile?.app_access_type}
                        />
                        <DetailRow
                            label="App access expires at"
                            value={profile?.app_access_expires_at}
                        />
                        <DetailRow
                            label="App access reason"
                            value={appAccessStatus?.reason}
                        />
                    </div>
                </section>

                <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-black text-slate-950">
                        Full-access feature results
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                        These results come from <code>getFeatureAccess</code> and{" "}
                        <code>canUseFullAccessFeature</code>.
                    </p>

                    <div className="mt-5 grid gap-3">
                        {FULL_ACCESS_FEATURES.map((feature) => {
                            const allowed = featureAccess
                                ? canUseFullAccessFeature(featureAccess, feature.key)
                                : false;

                            return (
                                <div
                                    key={feature.key}
                                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div>
                                        <div className="text-sm font-black text-slate-950">
                                            {feature.label}
                                        </div>
                                        <div className="mt-1 text-xs text-slate-500">
                                            Helper label: {getFullAccessFeatureLabel(feature.key)}
                                        </div>
                                        <p className="mt-2 text-sm leading-6 text-slate-600">
                                            {feature.note}
                                        </p>
                                    </div>

                                    <StatusPill allowed={allowed} />
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-black text-slate-950">
                        Simulated access scenarios
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                        These are read-only simulations. They do not change the database or the current user.
                        They only show how the feature helper behaves with different access inputs.
                    </p>

                    <div className="mt-5 grid gap-4">
                        {SIMULATED_ACCESS_SCENARIOS.map((scenario) => {
                            const simulatedFeatureAccess = getFeatureAccess({
                                role: scenario.role,
                                hasFullAccess: scenario.hasFullAccess,
                            });

                            return (
                                <div
                                    key={scenario.label}
                                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                                >
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <div className="text-base font-black text-slate-950">
                                                {scenario.label}
                                            </div>
                                            <p className="mt-1 text-sm leading-6 text-slate-600">
                                                {scenario.description}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-400">
                                                role: {scenario.role} · hasFullAccess:{" "}
                                                {String(scenario.hasFullAccess)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-4 grid gap-2 md:grid-cols-2">
                                        {FULL_ACCESS_FEATURES.map((feature) => {
                                            const allowed = canUseFullAccessFeature(
                                                simulatedFeatureAccess,
                                                feature.key
                                            );

                                            return (
                                                <div
                                                    key={`${scenario.label}-${feature.key}`}
                                                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
                                                >
                                                    <span className="text-sm font-semibold text-slate-800">
                                                        {feature.label}
                                                    </span>
                                                    <StatusPill allowed={allowed} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
                    <h2 className="text-lg font-black text-amber-950">
                        Testing reminder
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-amber-900">
                        This page currently checks the logged-in user only. Later we can add a safe
                        simulation panel for “free user,” “expired trial,” and “full-access user,”
                        but first we want to confirm the real helper functions are stable.
                    </p>
                </section>
            </div>
        </main>
    );
}