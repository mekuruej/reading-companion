// Ability Check Test Helper
//
// Internal super-teacher-only page for checking why Ability Check is or is not
// opening for the current account. This first version is read-only.
// It does not create cards, edit progress, or change study data.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type ProfileRow = {
  role: string | null;
  is_super_teacher: boolean | null;
};

type CurrentUserInfo = {
  id: string;
  email: string | null;
};

type CountResult = {
  count: number | null;
};

const ABILITY_CHECK_MIN_DUE_CARDS = 10;

function countValue(result: CountResult | null | undefined) {
  return result?.count ?? 0;
}

function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: number | string;
  note: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-3xl font-black text-slate-950">{value}</div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{note}</p>
    </div>
  );
}

export default function AbilityCheckTestHelperPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUserInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [bookCount, setBookCount] = useState(0);
  const [savedWordCount, setSavedWordCount] = useState(0);
  const [visibleSavedWordCount, setVisibleSavedWordCount] = useState(0);
  const [summaryReadyCount, setSummaryReadyCount] = useState(0);
  const [wordSkyClaimCount, setWordSkyClaimCount] = useState(0);
  const [progressCount, setProgressCount] = useState(0);
  const [masteredCount, setMasteredCount] = useState(0);
  const [heldBeforeReadingCount, setHeldBeforeReadingCount] = useState(0);
  const [heldBeforeMeaningCount, setHeldBeforeMeaningCount] = useState(0);

  useEffect(() => {
    async function loadTestInfo() {
      setLoading(true);
      setErrorMsg(null);

      try {
        const {
          data: { user },
          error: authErr,
        } = await supabase.auth.getUser();

        if (authErr || !user?.id) {
          setAllowed(false);
          setCurrentUser(null);
          setErrorMsg("You need to sign in to use the testing area.");
          setLoading(false);
          return;
        }

        setCurrentUser({
          id: user.id,
          email: user.email ?? null,
        });

        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("role, is_super_teacher")
          .eq("id", user.id)
          .maybeSingle<ProfileRow>();

        if (profileErr) throw profileErr;

        const canUseTesting =
          profile?.role === "super_teacher" ||
          profile?.is_super_teacher === true ||
          profile?.role === "admin";

        setAllowed(canUseTesting);

        if (!canUseTesting) {
          setLoading(false);
          return;
        }

        const { count: loadedBookCount, error: bookErr } = await supabase
          .from("user_books")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);

        if (bookErr) throw bookErr;

        setBookCount(loadedBookCount ?? 0);

        const { data: userBookRows, error: userBookRowsErr } = await supabase
          .from("user_books")
          .select("id")
          .eq("user_id", user.id);

        if (userBookRowsErr) throw userBookRowsErr;

        const userBookIds = (userBookRows ?? [])
          .map((row: any) => row.id)
          .filter(Boolean);

        if (userBookIds.length === 0) {
          setSavedWordCount(0);
          setVisibleSavedWordCount(0);
          setSummaryReadyCount(0);
          setWordSkyClaimCount(0);
          setProgressCount(0);
          setMasteredCount(0);
          setHeldBeforeReadingCount(0);
          setHeldBeforeMeaningCount(0);
          setLoading(false);
          return;
        }

        const { count: loadedSavedWordCount, error: savedWordErr } = await supabase
          .from("user_book_words")
          .select("id", { count: "exact", head: true })
          .in("user_book_id", userBookIds);

        if (savedWordErr) throw savedWordErr;

        setSavedWordCount(loadedSavedWordCount ?? 0);

        const { count: loadedVisibleSavedWordCount, error: visibleWordErr } =
          await supabase
            .from("user_book_words")
            .select("id", { count: "exact", head: true })
            .in("user_book_id", userBookIds)
            .or("hidden.is.null,hidden.eq.false");

        if (visibleWordErr) throw visibleWordErr;

        setVisibleSavedWordCount(loadedVisibleSavedWordCount ?? 0);

        const { count: loadedSummaryReadyCount, error: summaryErr } = await supabase
          .from("user_library_word_summaries")
          .select("study_identity_key", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gt("check_ready_encounter_count", 0);

        if (summaryErr) {
          console.warn("Ability Check summaries could not be counted:", summaryErr);
          setSummaryReadyCount(0);
        } else {
          setSummaryReadyCount(loadedSummaryReadyCount ?? 0);
        }

        const { count: loadedWordSkyClaimCount, error: claimErr } = await supabase
          .from("user_library_word_claims")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("claimed_color", "green");

        if (claimErr) {
          console.warn("Word Sky claims could not be counted:", claimErr);
          setWordSkyClaimCount(0);
        } else {
          setWordSkyClaimCount(loadedWordSkyClaimCount ?? 0);
        }

        const { count: loadedProgressCount, error: progressErr } = await supabase
          .from("user_library_word_progress")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);

        if (progressErr) {
          console.warn("Library progress could not be counted:", progressErr);
          setProgressCount(0);
        } else {
          setProgressCount(loadedProgressCount ?? 0);
        }

        const { count: loadedMasteredCount, error: masteredErr } = await supabase
          .from("user_library_word_progress")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("mastered", true);

        if (masteredErr) {
          console.warn("Mastered progress could not be counted:", masteredErr);
          setMasteredCount(0);
        } else {
          setMasteredCount(loadedMasteredCount ?? 0);
        }

        const { count: loadedHeldBeforeReadingCount, error: heldReadingErr } =
          await supabase
            .from("user_library_word_progress")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("held_before_reading_gate", true);

        if (heldReadingErr) {
          console.warn("Held-before-reading progress could not be counted:", heldReadingErr);
          setHeldBeforeReadingCount(0);
        } else {
          setHeldBeforeReadingCount(loadedHeldBeforeReadingCount ?? 0);
        }

        const { count: loadedHeldBeforeMeaningCount, error: heldMeaningErr } =
          await supabase
            .from("user_library_word_progress")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("held_before_meaning_gate", true);

        if (heldMeaningErr) {
          console.warn("Held-before-meaning progress could not be counted:", heldMeaningErr);
          setHeldBeforeMeaningCount(0);
        } else {
          setHeldBeforeMeaningCount(loadedHeldBeforeMeaningCount ?? 0);
        }
      } catch (error: any) {
        console.error("Error loading Ability Check test helper:", error);
        setErrorMsg(error?.message ?? "Could not load Ability Check test helper.");
      } finally {
        setLoading(false);
      }
    }

    void loadTestInfo();
  }, []);

  const possibleCheckCards = summaryReadyCount + wordSkyClaimCount;
  const enoughPossibleCards = possibleCheckCards >= ABILITY_CHECK_MIN_DUE_CARDS;

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 px-6 py-8">
        <div className="mx-auto max-w-5xl text-sm text-slate-500">
          Loading Ability Check test helper...
        </div>
      </main>
    );
  }

  if (errorMsg) {
    return (
      <main className="min-h-screen bg-slate-100 px-6 py-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            Ability Check Test Helper
          </p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">
            Could not load test info
          </h1>
          <p className="mt-3 text-sm leading-6 text-rose-700">{errorMsg}</p>
        </div>
      </main>
    );
  }

  if (!allowed) {
    return (
      <main className="min-h-screen bg-slate-100 px-6 py-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            Ability Check Test Helper
          </p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">
            Super-teacher access needed
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            This page shows internal testing information and is only for Mekuru testing.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4">
          <Link
            href="/teacher/testing"
            className="text-sm font-semibold text-slate-600 underline-offset-4 hover:text-slate-950 hover:underline"
          >
            ← Back to Testing Tools
          </Link>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            Mekuru Test Lab
          </p>

          <h1 className="mt-2 text-3xl font-black text-slate-950">
            Ability Check Test Helper
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            This page is read-only. It helps explain why Ability Check may not open
            for the current account. It does not create, edit, or delete study data.
          </p>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
            Testing user:{" "}
            <span className="font-semibold text-slate-900">
              {currentUser?.email ?? currentUser?.id ?? "Unknown"}
            </span>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">
            Ability Check opening estimate
          </h2>

          <div
            className={`mt-4 rounded-2xl border px-4 py-4 ${
              enoughPossibleCards
                ? "border-emerald-200 bg-emerald-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <div
              className={`text-lg font-black ${
                enoughPossibleCards ? "text-emerald-950" : "text-amber-950"
              }`}
            >
              {enoughPossibleCards
                ? "This account may have enough possible cards."
                : "This account probably does not have enough possible cards yet."}
            </div>

            <p
              className={`mt-2 text-sm leading-6 ${
                enoughPossibleCards ? "text-emerald-900" : "text-amber-900"
              }`}
            >
              Ability Check currently expects at least {ABILITY_CHECK_MIN_DUE_CARDS} cards.
              This helper found {possibleCheckCards} possible cards from summaries and Word Sky claims.
              Timing rules may still reduce the number that are actually due today.
            </p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <StatCard
              label="Possible check cards"
              value={possibleCheckCards}
              note="Summary-ready cards plus Word Sky green claims. This is an estimate."
            />
            <StatCard
              label="Minimum needed"
              value={ABILITY_CHECK_MIN_DUE_CARDS}
              note="Ability Check currently opens when at least this many cards are due."
            />
            <StatCard
              label="Still needed"
              value={Math.max(ABILITY_CHECK_MIN_DUE_CARDS - possibleCheckCards, 0)}
              note="Rough estimate before timing rules are applied."
            />
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">
            Current account data
          </h2>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <StatCard
              label="Books"
              value={bookCount}
              note="Books in this user's library."
            />
            <StatCard
              label="Saved words"
              value={savedWordCount}
              note="All saved word rows across this user's books."
            />
            <StatCard
              label="Visible saved words"
              value={visibleSavedWordCount}
              note="Saved words that are not hidden."
            />
            <StatCard
              label="Summary-ready words"
              value={summaryReadyCount}
              note="Rows in user_library_word_summaries with check_ready_encounter_count above 0."
            />
            <StatCard
              label="Word Sky claims"
              value={wordSkyClaimCount}
              note="Green Word Sky claims that may create check cards."
            />
            <StatCard
              label="Progress rows"
              value={progressCount}
              note="Rows in user_library_word_progress for this user."
            />
            <StatCard
              label="Mastered"
              value={masteredCount}
              note="Progress rows marked mastered / purple."
            />
            <StatCard
              label="Held before reading"
              value={heldBeforeReadingCount}
              note="Words waiting before the Reading Gate."
            />
            <StatCard
              label="Held before meaning"
              value={heldBeforeMeaningCount}
              note="Words waiting before the Meaning Gate or deeper support."
            />
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">
            What this helper does not know yet
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            This first test helper does not exactly recreate the full Ability Check deck.
            The real page also uses timing rules, daily seen cards, color logic, progress state,
            JLPT filters, and localStorage. This helper is meant to answer the first question:
            “Do I have enough likely ingredients to test Ability Check?”
          </p>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            Later, we can add a safer test-data tool that creates 10 controlled test cards
            for a super-teacher test account.
          </p>
        </section>
      </div>
    </main>
  );
}