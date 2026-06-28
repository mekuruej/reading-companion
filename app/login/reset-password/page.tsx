"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let alive = true;

    const prepareRecoverySession = async () => {
      setError("");

      const code = searchParams.get("code");
      if (code) {
        const { error: codeError } = await supabase.auth.exchangeCodeForSession(code);
        if (codeError && alive) {
          setError("This reset link could not be used. Please request a new one.");
        }
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (!alive) return;

      if (sessionError) {
        setError("We could not confirm your reset link. Please request a new one.");
      }

      setReady(Boolean(session?.user?.id));
      setCheckingSession(false);
    };

    prepareRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive) return;

      if (event === "PASSWORD_RECOVERY" || session?.user?.id) {
        setReady(true);
        setCheckingSession(false);
      }
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, [searchParams]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 6) {
      setError("Use a password with at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (updateError) {
      setError("We could not update your password. Please try the reset link again.");
      return;
    }

    setMessage("Your password has been updated. Taking you back to sign in...");
    window.setTimeout(() => router.replace("/login"), 1200);
  };

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-xl items-center justify-center">
        <div className="w-full rounded-2xl border bg-white p-6 shadow-sm">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
            MEKURU
          </p>

          <h1 className="mt-2 text-center text-2xl font-semibold">
            Choose a new password
          </h1>

          {checkingSession ? (
            <p className="mt-6 text-center text-sm text-slate-500">
              Checking your reset link...
            </p>
          ) : ready ? (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label className="block text-sm font-semibold text-slate-700">
                New password
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-base shadow-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                  disabled={loading}
                />
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Confirm password
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-base shadow-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                  disabled={loading}
                />
              </label>

              {error ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </p>
              ) : null}

              {message ? (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                  {message}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {loading ? "Updating..." : "Update password"}
              </button>
            </form>
          ) : (
            <div className="mt-6 space-y-4">
              {error ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </p>
              ) : (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                  This reset link is missing or expired. Please request a new one.
                </p>
              )}

              <Link
                href="/login/forgot-password"
                className="block w-full rounded-lg bg-slate-950 px-4 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                Request a new link
              </Link>
            </div>
          )}

          <div className="mt-5 text-center text-sm text-slate-500">
            <Link href="/login" className="font-semibold underline">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-100 p-6">
          <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-xl items-center justify-center">
            <div className="w-full rounded-2xl border bg-white p-6 text-center shadow-sm">
              <p className="text-sm text-slate-500">Loading reset page...</p>
            </div>
          </div>
        </main>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
