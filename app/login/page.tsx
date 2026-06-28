"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useRouter } from "next/navigation";

const POST_LOGIN_PARAM = "after_login";
const POST_LOGIN_VALUE = "library";
const POST_LOGIN_DASHBOARD_TARGET = `/dashboard?${POST_LOGIN_PARAM}=${POST_LOGIN_VALUE}`;

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
        router.replace("/dashboard");
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
        router.replace(POST_LOGIN_DASHBOARD_TARGET);
      } else if (session?.user?.id) {
        router.replace("/dashboard");
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
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-xl items-center justify-center">
        <div className="w-full rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="mb-4 text-center text-2xl font-semibold">Sign in</h1>

          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            providers={["google"]}
            view="sign_in"
            showLinks={false}
            redirectTo={
              typeof window !== "undefined"
                ? `${window.location.origin}/dashboard?${POST_LOGIN_PARAM}=${POST_LOGIN_VALUE}`
                : undefined
            }
          />

          <div className="mt-4 text-center text-sm text-slate-500">
            <Link href="/login/forgot-password" className="font-semibold underline">
              Forgot your password?
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
