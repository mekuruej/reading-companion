"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
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

      setHasSession(!!session);

      if (session?.user?.id) {
        const { data, error } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", session.user.id)
          .maybeSingle();

        if (!alive) return;

        if (error) {
          console.error("Error loading username:", error);
          setUsername(null);
        } else {
          setUsername(data?.username ?? null);
        }
      } else {
        setUsername(null);
      }

      setChecking(false);
    };

    run();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!alive) return;

      setHasSession(!!session);

      if (session?.user?.id) {
        const { data, error } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", session.user.id)
          .maybeSingle();

        if (!alive) return;

        if (error) {
          console.error("Error loading username:", error);
          setUsername(null);
        } else {
          setUsername(data?.username ?? null);
        }
      } else {
        setUsername(null);
      }

      setChecking(false);
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
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md border rounded-lg p-6 shadow-sm">
        <h1 className="text-2xl font-semibold mb-4 text-center">Sign in</h1>

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
    </main>
  );
}