// Teacher Testing Hub
//
// Internal testing pages for checking Mekuru behavior during development.
// These pages should stay teacher/super-teacher only and should never be linked
// from learner-facing navigation.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type ProfileRow = {
    role: string | null;
    is_super_teacher: boolean | null;
};

export default function TeacherTestingPage() {
    const [loading, setLoading] = useState(true);
    const [allowed, setAllowed] = useState(false);

    useEffect(() => {
        async function checkAccess() {
            setLoading(true);

            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user?.id) {
                setAllowed(false);
                setLoading(false);
                return;
            }

            const { data: profile } = await supabase
                .from("profiles")
                .select("role, is_super_teacher")
                .eq("id", user.id)
                .maybeSingle<ProfileRow>();

            const canUseTesting =
                profile?.role === "super_teacher" ||
                profile?.is_super_teacher === true ||
                profile?.role === "admin";

            setAllowed(canUseTesting);
            setLoading(false);
        }

        void checkAccess();
    }, []);

    if (loading) {
        return (
            <main className="min-h-screen bg-slate-100 px-6 py-8">
                <div className="mx-auto max-w-4xl text-sm text-slate-500">
                    Loading testing tools...
                </div>
            </main>
        );
    }

    if (!allowed) {
        return (
            <main className="min-h-screen bg-slate-100 px-6 py-8">
                <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                        Testing area
                    </p>
                    <h1 className="mt-2 text-2xl font-black text-slate-950">
                        Super-teacher access needed
                    </h1>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                        These pages are only for internal Mekuru testing.
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-100 px-6 py-8">
            <div className="mx-auto max-w-4xl">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                        Mekuru Test Lab
                    </p>

                    <h1 className="mt-2 text-3xl font-black text-slate-950">
                        Testing tools
                    </h1>

                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                        Internal pages for checking access rules, feature gates, test data,
                        and tricky app behavior before changing real user-facing pages.
                    </p>

                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                        <Link
                            href="/teacher/testing/feature-access"
                            className="rounded-2xl border border-sky-200 bg-sky-50 p-5 shadow-sm transition hover:bg-sky-100"
                        >
                            <div className="text-sm font-black text-sky-950">
                                Feature Access Test
                            </div>
                            <p className="mt-2 text-sm leading-6 text-sky-900">
                                Check what Mekuru thinks this user can access: Add Word,
                                Curiosity Reading, Vocabulary List, Study Flashcards, Ability Check,
                                and other full-access features.
                            </p>
                        </Link>

                        <Link
                            href="/teacher/testing/ability-check"
                            className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm transition hover:bg-emerald-100"
                        >
                            <div className="text-sm font-black text-emerald-950">
                                Ability Check Test Helper
                            </div>
                            <p className="mt-2 text-sm leading-6 text-emerald-900">
                                Check saved vocabulary totals, possible Ability Check cards, Word Sky claims,
                                and why Ability Check may not be opening for the current account.
                            </p>
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}