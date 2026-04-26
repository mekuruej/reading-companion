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
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-xl items-center justify-center">
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
    </main>
  );
}
