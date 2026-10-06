"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// Presentation preference only; never used to grant access.
export const TRIAL_ONBOARDING_KEY = "mekuru_trial_onboarding_completed";

export default function TrialOnboarding({ onComplete }: { onComplete: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function continueTo(href: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const { error: saveError } = await supabase.auth.updateUser({
        data: { [TRIAL_ONBOARDING_KEY]: true },
      });
      if (saveError) throw saveError;
      onComplete();
      router.push(href);
    } catch {
      setError("Could not save your welcome preference. Please try again.");
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f3ee] px-5 py-12 text-stone-950">
      <section aria-labelledby="trial-welcome-title" className="mx-auto max-w-2xl rounded-3xl border border-violet-100 bg-white p-6 shadow-sm sm:p-10">
        <h1 id="trial-welcome-title" className="text-3xl font-black sm:text-4xl">Your trial is ready.</h1>
        <h2 className="mt-8 text-lg font-bold">Start here:</h2>
        <ol className="mt-4 list-decimal space-y-4 pl-6 leading-7 text-stone-700">
          <li>Add a Japanese book</li>
          <li>Open the book and use Save Words while you read</li>
          <li>Review the vocabulary you’ve saved</li>
          <li>Try Follow-Along when you want to review with reading support</li>
        </ol>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button type="button" disabled={busy} onClick={() => void continueTo("/books/add?destination=my-library")} className="rounded-full bg-violet-700 px-5 py-3 text-sm font-bold text-white hover:bg-violet-800 disabled:opacity-60">
            Add my first Japanese book
          </button>
          <button type="button" disabled={busy} onClick={() => void continueTo("/library-study")} className="rounded-full border border-stone-300 px-5 py-3 text-sm font-bold hover:bg-stone-50 disabled:opacity-60">
            Go to Japanese Study
          </button>
        </div>
        {error ? <p role="alert" className="mt-4 text-sm text-red-700">{error}</p> : null}
      </section>
    </main>
  );
}
