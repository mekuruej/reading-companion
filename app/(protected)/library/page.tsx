// Library Hub
//

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const DAY_MS = 1000 * 60 * 60 * 24;

type TrialBannerState = {
  daysRemaining: number | null;
  formattedDate: string;
} | null;

const libraryCards = [
  {
    title: "My Mekuru Library",
    href: "/books",
    eyebrow: "Your books",
    description: "See your books, reading progress, and monthly reading snapshot.",
    className: "border-amber-200 bg-amber-50 text-amber-950",
  },
  {
    title: "Add a Book",
    href: "/books/add?destination=my-library",
    eyebrow: "New book",
    description: "Look up an ISBN and add a new book to your Mekuru library.",
    className: "border-rose-200 bg-rose-50 text-rose-950",
  },
  {
    title: "Book Hubs",
    href: "/library/book-hubs",
    eyebrow: "Book spaces",
    description: "Jump into a book’s reading tools, vocab list, notes, and stats.",
    className: "border-emerald-200 bg-emerald-50 text-emerald-950",
  },
  {
    title: "Vocab Lists",
    href: "/vocab",
    eyebrow: "Words by book",
    description: "Browse saved vocabulary grouped by the books where you met it.",
    className: "border-sky-200 bg-sky-50 text-sky-950",
  },
];

function formatTrialEndDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function TrialCountdownBanner() {
  const [trialBanner, setTrialBanner] = useState<TrialBannerState>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTrialBanner() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("app_access_type, app_access_expires_at")
        .eq("id", user.id)
        .maybeSingle<{
          app_access_type: string | null;
          app_access_expires_at: string | null;
        }>();

      if (cancelled || error) return;

      const accessType = data?.app_access_type?.trim().toLowerCase();
      const expiresAt = data?.app_access_expires_at;
      if (accessType !== "trial" || !expiresAt) return;

      const expiry = new Date(expiresAt);
      const msRemaining = expiry.getTime() - Date.now();
      if (Number.isNaN(expiry.getTime()) || msRemaining <= 0) return;

      setTrialBanner({
        daysRemaining: msRemaining < DAY_MS ? null : Math.ceil(msRemaining / DAY_MS),
        formattedDate: formatTrialEndDate(expiry),
      });
    }

    void loadTrialBanner();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!trialBanner) return null;

  return (
    <section aria-label="Trial access" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-800">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p>
          <span className="font-medium text-emerald-900">
            {trialBanner.daysRemaining == null
              ? "Your trial has less than 1 day left"
              : `Your trial has ${trialBanner.daysRemaining} ${trialBanner.daysRemaining === 1 ? "day" : "days"} left`}
          </span>
          <span className="ml-2 text-xs">Ends {trialBanner.formattedDate}.</span>
        </p>
        <details className="text-xs">
          <summary className="cursor-pointer rounded text-emerald-800 underline decoration-emerald-300 underline-offset-4 hover:text-emerald-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">
            After your trial
          </summary>
          <div className="mt-2 max-w-md leading-5">
            <p>Continue Japanese Learning for ¥500/month, including vocabulary, flashcards, Follow-Along, and reading tracking.</p>
            <p className="mt-1">After you join on Ko-fi, your MEKURU access will be updated manually.</p>
            <Link href="/reading-access" className="mt-2 inline-block font-medium text-emerald-900 underline underline-offset-4 hover:text-emerald-950">Explore Japanese Learning</Link>
          </div>
        </details>
      </div>
    </section>
  );
}

export default function LibraryHubPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-5 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Mekuru Library
          </p>

          <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
            Library Hub
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Find your books, book spaces, and saved vocabulary.
          </p>
        </div>

        <TrialCountdownBanner />

        <div className="grid gap-4 md:grid-cols-2">
          {libraryCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={`group rounded-3xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${card.className}`}
            >
              <div className="text-xs font-black uppercase tracking-[0.18em] opacity-60">
                {card.eyebrow}
              </div>

              <div className="mt-3 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black">{card.title}</h2>
                  <p className="mt-2 text-sm leading-6 opacity-80">
                    {card.description}
                  </p>
                </div>

                <span className="rounded-full bg-white/80 px-3 py-1 text-sm font-black shadow-sm transition group-hover:bg-white">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
