"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useRouter } from "next/navigation";

const POST_LOGIN_LIBRARY_TARGET = "/books";

export default function LoginPage() {
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let alive = true;

    const run = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!alive) return;

      if (session?.user?.id) {
        router.replace(POST_LOGIN_LIBRARY_TARGET);
        return;
      }

      setChecking(false);
    };

    run();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!alive) return;

      if (event === "SIGNED_IN" && session?.user?.id) {
        router.replace(POST_LOGIN_LIBRARY_TARGET);
      } else if (session?.user?.id) {
        router.replace(POST_LOGIN_LIBRARY_TARGET);
      } else {
        setChecking(false);
      }
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md border rounded-lg p-6 shadow-sm text-center">
          <p className="text-gray-600">Checking sign-in...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 px-5 py-8 text-slate-900 sm:px-8 sm:py-12 lg:flex lg:items-center lg:px-12">
      <div className="mx-auto grid w-full max-w-7xl items-center gap-8 lg:grid-cols-[1.3fr_1fr] lg:gap-12 xl:gap-16">
        <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-xl shadow-stone-300/30">
          <img
            src="/mekuru-banner.png"
            alt="MEKURU logo surrounded by Japanese book covers"
            width={1640}
            height={924}
            className="h-48 w-full object-cover object-center sm:h-64 lg:h-auto"
          />
        </div>

        <div className="mx-auto w-full max-w-md">
          <header className="mb-6 text-center">
            <h1 className="font-serif text-[1.75rem] leading-tight tracking-tight text-stone-900 sm:text-[2rem]">
              Welcome back to MEKURU
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Keep reading, keep noticing, keep building your Japanese one book at a time.
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Sign in to return to your library and continue where you left off.
            </p>
          </header>

          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40 sm:p-8">
            <Auth
              supabaseClient={supabase}
              appearance={{ theme: ThemeSupa }}
              providers={["google"]}
              view="sign_in"
              showLinks={false}
              redirectTo={
                typeof window !== "undefined"
                  ? `${window.location.origin}${POST_LOGIN_LIBRARY_TARGET}`
                  : undefined
              }
            />

            <div className="mt-4 text-center text-sm text-slate-500">
              <Link href="/login/forgot-password" className="font-semibold underline">
                Forgot your password?
              </Link>
            </div>

            <div className="mt-5 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">
              <p>Don’t have an account?</p>
              <Link href="/login/beta-signup" className="mt-1 inline-flex font-semibold underline">
                Create a free account →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
