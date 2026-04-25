"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!checking && hasSession) {
      if (username) {
        router.replace(`/users/${username}/books`);
      } else {
        router.replace("/books");
      }
    }
  }, [checking, hasSession, username, router]);

  useEffect(() => {
    let alive = true;

    const run = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!alive) return;

      if (session?.user?.id) {
        const { data, error } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", session.user.id)
          .maybeSingle();

        if (!alive) return;

        if (!error && data?.username) {
          router.replace(`/users/${data.username}/books`);
          return;
        } else {
          router.replace("/books");
          return;
        }
      }

      setHasSession(false);
      setChecking(false);
    };

    run();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!alive) return;

      if (session?.user?.id) {
        const { data, error } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", session.user.id)
          .maybeSingle();

        if (!alive) return;

        if (!error && data?.username) {
          router.replace(`/users/${data.username}/books`);
        } else {
          router.replace("/books");
        }
      } else {
        setHasSession(false);
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
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-stone-300 bg-stone-50 p-5 shadow-sm">
              <div className="text-sm font-semibold text-stone-900">looker-upper</div>
              <div className="mt-1 text-sm text-stone-500">
                noun · official Mekuru book club term
              </div>
              <p className="mt-2 text-sm leading-6 text-stone-700">
                A reader who cannot help stopping to look up words, grammar, and anything else
                they find interesting.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-300 bg-stone-50 p-5 shadow-sm">
              <div className="text-sm font-semibold text-stone-900">non-looker-upper</div>
              <div className="mt-1 text-sm text-stone-500">
                noun · official Mekuru book club term
              </div>
              <p className="mt-2 text-sm leading-6 text-stone-700">
                A reader who wants to immerse themselves in the story, keep going, and practice
                fluid reading with only light support when needed.
              </p>
            </div>
          </div>

          <div className="w-full rounded-2xl border bg-white p-6 shadow-sm">
            <h1 className="mb-4 text-center text-2xl font-semibold">Sign in</h1>

            <Auth
              supabaseClient={supabase}
              appearance={{ theme: ThemeSupa }}
              providers={["google"]}
              redirectTo={
                typeof window !== "undefined"
                  ? `${window.location.origin}/login`
                  : undefined
              }
            />
          </div>
        </div>
      </div>
    </main>
  );
}
