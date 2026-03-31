"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";

export default function LoginPage() {
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let alive = true;

    const run = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!alive) return;

      setHasSession(!!session);
      setChecking(false);
    };

    run();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      setHasSession(!!session);
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

  if (hasSession) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md border rounded-lg p-6 shadow-sm text-center">
          <p className="text-gray-700 mb-4">You are signed in.</p>
          <a
            href="/books"
            className="inline-block px-4 py-2 bg-gray-800 text-white rounded hover:bg-black transition"
          >
            Continue to Books
          </a>
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