// App Dashboard
//

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/lib/supabaseClient";
import DashboardBackground from "./components/DashboardBackground";
import DashboardLoadingCard from "./components/DashboardLoadingCard";
import DashboardBackButton from "./components/DashboardBackButton";
import ReaderRolesSection from "./components/ReaderRolesSection";
import DashboardWarmupPanel from "./components/DashboardWarmupPanel";
import SignedInDashboardCard from "./components/SignedInDashboardCard";
import SignedOutLoginSection from "./components/SignedOutLoginSection";

const POST_LOGIN_TARGET = "/books";
const POST_LOGIN_PARAM = "after_login";
const POST_LOGIN_VALUE = "library";
const PROFILE_SETUP_TARGET = "/community/profile/setup";
const WARMUP_WORD_COUNT = 4;

type WarmupWord = {
  surface: string;
  reading: string;
  meaning: string;
};

type WordSkyPoolRow = {
  surface: string | null;
  reading: string | null;
  meaning: string | null;
};

const FALLBACK_WARMUP_WORDS: WarmupWord[] = [
  { surface: "本", reading: "ほん", meaning: "book" },
  { surface: "場所", reading: "ばしょ", meaning: "place" },
  { surface: "気持ち", reading: "きもち", meaning: "feeling" },
  { surface: "時間", reading: "じかん", meaning: "time" },
  { surface: "読む", reading: "よむ", meaning: "to read" },
  { surface: "物語", reading: "ものがたり", meaning: "story" },
];

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeKana(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
    .toLowerCase();
}

function studyIdentityKey(surface: string, reading: string) {
  return `${normalizeText(surface)}||${normalizeKana(reading)}`;
}

function dashboardWarmupSeed(userId: string) {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return `${userId}:${day}`;
}

function seededScore(seed: string, value: string) {
  let hash = 2166136261;
  const text = `${seed}:${value}`;

  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function dailyWarmupWords(words: WarmupWord[], userId: string) {
  const seed = dashboardWarmupSeed(userId);
  const seen = new Set<string>();

  return words
    .filter((word) => {
      const key = studyIdentityKey(word.surface, word.reading);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort(
      (a, b) =>
        seededScore(seed, studyIdentityKey(a.surface, a.reading)) -
        seededScore(seed, studyIdentityKey(b.surface, b.reading))
    )
    .slice(0, WARMUP_WORD_COUNT);
}

type ProfileBasics = {
  username: string | null;
  display_name: string | null;
  native_language: string | null;
  target_language: string | null;
  level: string | null;
};

function isProfileReady(profile: ProfileBasics | null) {
  return Boolean(
    profile?.username &&
    profile?.display_name &&
    profile?.native_language &&
    profile?.target_language &&
    profile?.level
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [warmupWords, setWarmupWords] = useState<WarmupWord[]>([]);
  const [warmupLoading, setWarmupLoading] = useState(true);
  const [warmupClaimKeys, setWarmupClaimKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;

    async function routeSignedInUser(userId: string, shouldOpenLibraryAfterLogin: boolean) {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("username, display_name, native_language, target_language, level")
        .eq("id", userId)
        .maybeSingle<ProfileBasics>();

      if (!alive) return true;

      if (error) {
        console.error("Error checking dashboard profile:", error);
        setIsLoggedIn(true);
        setCheckingSession(false);
        return true;
      }

      if (!isProfileReady(profile ?? null)) {
        router.replace(PROFILE_SETUP_TARGET);
        return true;
      }

      if (shouldOpenLibraryAfterLogin) {
        router.replace(POST_LOGIN_TARGET);
        return true;
      }

      return false;
    }

    async function loadSession() {
      const params = new URLSearchParams(window.location.search);
      const authCode = params.get("code");
      const shouldOpenLibraryAfterLogin = params.get(POST_LOGIN_PARAM) === POST_LOGIN_VALUE;

      if (authCode) {
        const { error } = await supabase.auth.exchangeCodeForSession(authCode);

        if (error) {
          console.error("Error finishing dashboard sign-in:", error);
        } else {
          window.history.replaceState(null, "", "/dashboard");
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!alive) return;

      if (session?.user?.id) {
        setUserId(session.user.id);
        const routed = await routeSignedInUser(session.user.id, shouldOpenLibraryAfterLogin);
        if (routed) return;
      } else {
        setUserId(null);
      }

      setIsLoggedIn(Boolean(session?.user));
      setCheckingSession(false);
    }

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive) return;

      const params = new URLSearchParams(window.location.search);
      const shouldOpenLibraryAfterLogin = params.get(POST_LOGIN_PARAM) === POST_LOGIN_VALUE;

      if (event === "SIGNED_IN" && session?.user && shouldOpenLibraryAfterLogin) {
        setUserId(session.user.id);
        void routeSignedInUser(session.user.id, true);
        return;
      }

      setUserId(session?.user?.id ?? null);
      setIsLoggedIn(Boolean(session?.user));
      setCheckingSession(false);
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadWarmupWordsAndClaims() {
      if (!userId) {
        setWarmupWords([]);
        setWarmupClaimKeys(new Set());
        setWarmupLoading(false);
        return;
      }

      setWarmupLoading(true);
      let words = dailyWarmupWords(FALLBACK_WARMUP_WORDS, userId);

      const { data: poolData, error: poolError } = await supabase.rpc("get_word_sky_pool", {
        p_limit: 120,
      });

      if (!poolError && Array.isArray(poolData)) {
        const poolWords = (poolData as WordSkyPoolRow[])
          .map((row): WarmupWord | null => {
            const surface = (row.surface ?? "").trim();
            const reading = (row.reading ?? "").trim();
            const meaning = (row.meaning ?? "").trim();
            if (!surface || !reading || !meaning) return null;
            return { surface, reading, meaning };
          })
          .filter((word): word is WarmupWord => Boolean(word));

        if (poolWords.length > 0) {
          words = dailyWarmupWords(poolWords, userId);
        }
      } else if (poolError) {
        console.warn("Dashboard warm-up pool did not load:", poolError);
      }

      const keys = words.map((word) => studyIdentityKey(word.surface, word.reading));
      const { data, error } = await supabase
        .from("user_library_word_claims")
        .select("study_identity_key")
        .eq("user_id", userId)
        .in("study_identity_key", keys);

      if (cancelled) return;

      if (error) {
        console.warn("Dashboard warm-up claims did not load:", error);
        setWarmupWords(words);
        setWarmupClaimKeys(new Set());
        setWarmupLoading(false);
        return;
      }

      setWarmupWords(words);
      setWarmupClaimKeys(new Set((data ?? []).map((row) => row.study_identity_key)));
      setWarmupLoading(false);
    }

    void loadWarmupWordsAndClaims();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function claimWarmupWord(word: WarmupWord) {
    if (!userId) return;

    const key = studyIdentityKey(word.surface, word.reading);

    if (warmupClaimKeys.has(key)) {
      setWarmupClaimKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });

      const { error } = await supabase
        .from("user_library_word_claims")
        .delete()
        .eq("user_id", userId)
        .eq("study_identity_key", key);

      if (error) {
        console.error("Could not clear dashboard warm-up word:", error);
        setWarmupClaimKeys((prev) => new Set(prev).add(key));
      }

      return;
    }

    setWarmupClaimKeys((prev) => new Set(prev).add(key));

    const { error } = await supabase.from("user_library_word_claims").upsert(
      {
        user_id: userId,
        study_identity_key: key,
        surface: word.surface,
        reading: word.reading,
        meaning: word.meaning,
        claimed_color: "green",
        source: "word_sky",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,study_identity_key" }
    );

    if (error) {
      console.error("Could not save dashboard warm-up word:", error);
      setWarmupClaimKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-100 text-slate-950">
      <DashboardBackground />

      <div className="relative z-10 flex flex-col items-center gap-10 px-6 py-12 text-center">
        {checkingSession ? (
          <section className="w-full max-w-xl">
            <DashboardLoadingCard />
          </section>
        ) : isLoggedIn ? (
          <SignedInDashboardCard onOpenLibrary={() => router.push("/books")}>
            {warmupLoading ? (
              <div className="relative mt-4 flex h-44 items-center justify-center overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-indigo-50">
                <p className="text-sm font-medium text-sky-800">
                  Loading your Word Sky...
                </p>
              </div>
            ) : (
              <DashboardWarmupPanel
                words={warmupWords}
                claimedKeys={warmupClaimKeys}
                getKey={(word) => studyIdentityKey(word.surface, word.reading)}
                onToggleWord={claimWarmupWord}
              />
            )}
          </SignedInDashboardCard>
        ) : (
          <>
            <SignedOutLoginSection>
              <Auth
                supabaseClient={supabase}
                appearance={{ theme: ThemeSupa }}
                providers={["google"]}
                view="sign_in"
                showLinks={false}
                redirectTo={
                  typeof window !== "undefined"
                    ? `${window.location.origin}/dashboard`
                    : undefined
                }
              />

              <div className="mt-4 text-center text-sm text-slate-500">
                <Link href="/login/forgot-password" className="font-semibold underline">
                  Forgot your password?
                </Link>
              </div>
            </SignedOutLoginSection>

            <ReaderRolesSection />
          </>
        )}

        <div className="flex w-full justify-center">
          <DashboardBackButton onBack={() => router.push("/")} />
        </div>
      </div>

      <style jsx>{`
        @keyframes dashboard-word-bob {
          0% {
            transform: translate3d(-6px, 0, 0);
          }
          50% {
            transform: translate3d(8px, -10px, 0);
          }
          100% {
            transform: translate3d(-6px, 0, 0);
          }
        }
      `}</style>
    </main>
  );
}
