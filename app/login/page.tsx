"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";

export default function LoginPage() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let alive = true;

    const goBooks = () => {
      window.location.href = "/books";
    };

    const run = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!alive) return;

      if (session) {
        goBooks();
        return;
      }

      setChecking(false);
    };

    run();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        goBooks();
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
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md border rounded-lg p-6 shadow-sm">
        <h1 className="text-2xl font-semibold mb-4 text-center">Sign in</h1>

        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={["google"]}
          redirectTo={typeof window !== "undefined" ? window.location.origin : undefined}
        />
      </div>
    </main>
  );
}