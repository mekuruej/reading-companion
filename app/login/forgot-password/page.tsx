"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const successMessage =
  "If an account exists for that email, we sent a password reset link.";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedEmail = email.trim();
    setError("");
    setMessage("");

    if (!trimmedEmail) {
      setError("Enter the email address for your MEKURU account.");
      return;
    }

    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      trimmedEmail,
      {
        redirectTo: `${window.location.origin}/login/reset-password`,
      }
    );

    setLoading(false);

    if (resetError) {
      setError("We could not send a reset link right now. Please try again.");
      return;
    }

    setMessage(successMessage);
  };

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-xl items-center justify-center">
        <div className="w-full rounded-2xl border bg-white p-6 shadow-sm">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
            MEKURU
          </p>

          <h1 className="mt-2 text-center text-2xl font-semibold">
            Reset your password
          </h1>

          <p className="mx-auto mt-3 max-w-md text-center text-sm leading-6 text-slate-500">
            Enter your email and we’ll send a password reset link if there is a
            MEKURU account for it.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block text-sm font-semibold text-slate-700">
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-base shadow-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                placeholder="you@example.com"
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
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>

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
