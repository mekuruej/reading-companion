// Beta Signup Page
//

"use client";

import Link from "next/link";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/lib/supabaseClient";

export default function BetaSignupPage() {
    return (
        <main className="min-h-screen bg-slate-100 p-6">
            <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-xl items-center justify-center">
                <div className="w-full rounded-2xl border bg-white p-6 shadow-sm">
                    <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                        MEKURU Beta
                    </p>

                    <h1 className="mt-2 text-center text-2xl font-semibold">
                        Create your MEKURU account
                    </h1>

                    <p className="mx-auto mt-3 max-w-md text-center text-sm leading-6 text-slate-500">
                        This signup page is for invited beta readers and enrolled students.
                        Use the email or Google account you’d like connected to your MEKURU library.
                    </p>

                    <div className="mt-6">
                        <Auth
                            supabaseClient={supabase}
                            appearance={{ theme: ThemeSupa }}
                            providers={["google"]}
                            view="sign_up"
                            showLinks={false}
                            redirectTo={
                                typeof window !== "undefined"
                                    ? `${window.location.origin}/dashboard`
                                    : undefined
                            }
                        />
                    </div>

                    <div className="mt-5 text-center text-xs text-slate-500">
                        Already have an account?{" "}
                        <Link href="/login" className="font-semibold underline">
                            Sign in here
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}