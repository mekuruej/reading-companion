// App Dashboard
//

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/lib/supabaseClient";
import DashboardBackground from "./components/DashboardBackground";
import DashboardLoadingCard from "./components/DashboardLoadingCard";

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
  const [warmupWords, setWarmupWords] = useState<WarmupWord[]>(
    FALLBACK_WARMUP_WORDS.slice(0, WARMUP_WORD_COUNT)
  );
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
        setWarmupWords(FALLBACK_WARMUP_WORDS.slice(0, WARMUP_WORD_COUNT));
        setWarmupClaimKeys(new Set());
        return;
      }

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
        return;
      }

      setWarmupWords(words);
      setWarmupClaimKeys(new Set((data ?? []).map((row) => row.study_identity_key)));
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
          <section className="w-full max-w-xl">
            <div className="rounded-3xl border border-slate-200 bg-white/90 px-6 py-6 text-center shadow-sm">
              <>
                <h2 className="text-3xl font-semibold">Welcome to Mekuru</h2>
                <p className="mt-3 text-gray-500">
                  Every word carries the memory of where you met it.
                  <br />
                  ページをめくって、話しまくろう！
                </p>

                <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50/80 p-4 shadow-inner">
                  <div className="text-left">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">
                      Word warm-up
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Tap a few words you can read.
                    </p>
                  </div>

                  <div className="relative mt-4 h-44 overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-indigo-50">
                    {warmupWords.map((word, index) => {
                      const key = studyIdentityKey(word.surface, word.reading);
                      const claimed = warmupClaimKeys.has(key);
                      const positions = [
                        ["18%", "12%"],
                        ["58%", "25%"],
                        ["30%", "52%"],
                        ["66%", "70%"],
                      ];
                      const [top, left] = positions[index] ?? ["40%", "40%"];

                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => claimWarmupWord(word)}
                          className={[
                            "absolute rounded-full border px-4 py-2 text-base font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
                            claimed
                              ? "border-emerald-200 bg-emerald-100 text-emerald-900"
                              : "border-white bg-white/90 text-slate-800",
                          ].join(" ")}
                          style={{
                            top,
                            left,
                            animation: `dashboard-word-bob ${9 + index}s ease-in-out ${index * -1.7}s infinite`,
                          }}
                        >
                          {word.surface}
                        </button>
                      );
                    })}
                  </div>

                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    Tapped words move to your Reading Gate in Ability Check. Find more words in Word Sky later.
                  </p>
                </div>

                <button
                  onClick={() => router.push("/books")}
                  className="mt-5 w-full rounded-xl bg-slate-800 px-4 py-3 text-white shadow-md transition hover:-translate-y-0.5 hover:bg-slate-900 hover:shadow-lg"
                >
                  Go to My Library
                </button>

              </>
            </div>
          </section>
        ) : (
          <>
            <section className="grid w-full max-w-5xl items-center gap-5 lg:grid-cols-[1.25fr_0.75fr]">
              <img
                src="/mekuru-banner.png"
                alt="MEKURU banner"
                className="w-full rounded-2xl border border-slate-200 object-cover shadow-lg shadow-slate-300/40"
              />

              <div className="rounded-3xl border border-slate-200 bg-white/85 px-6 py-6 text-center shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                  Student Entrance
                </p>
                <h2 className="mt-2 text-3xl font-semibold">Welcome to Mekuru</h2>
                <p className="mt-3 text-sm leading-6 text-gray-500">
                  Sign in to open your reading library, saved words, study tools, and teacher
                  assignments.
                </p>

                <div className="mt-5 text-left">
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
                </div>

                <p className="mt-3 text-xs leading-5 text-slate-500">
                  App access is for enrolled students & beta readers only.
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Would you like to try Mekuru? Join the beta waiting list{" "}
                  <a
                    href="https://forms.gle/5QLgohvkNvDBzTuH9"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold underline underline-offset-4 hover:text-slate-900"
                  >
                    here
                  </a>
                  .
                </p>
              </div>
            </section>

            <section className="w-full max-w-5xl">
              <div className="mb-4 text-center">
                <h3 className="mt-1 text-2xl font-black text-slate-950">
                  Every reading journey needs its characters.
                </h3>
                <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Alchemist, Sage, or Magician — every reader brings a different kind of magic to the story.
                </p>
              </div>

              <div className="grid w-full gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-300 bg-white/85 p-5 text-left shadow-sm">
                  <div className="mb-4 flex justify-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border border-slate-300 bg-slate-100 shadow-inner">
                      <img
                        src="/reader-roles/alchemist.svg"
                        alt="Alchemist icon"
                        className="h-12 w-12 object-contain opacity-80"
                      />
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-stone-900">
                    The Alchemists
                  </div>
                  <div className="mt-1 text-sm text-stone-500">
                    aka looker-uppers
                  </div>

                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-stone-700">
                    <li>
                      Devoted to nuance, unknown words, and the divisive phrase,
                      “just one more quick look-up.”
                    </li>
                    <li>
                      Endlessly gathering vocabulary, grammar, and kanji in their back
                      pockets for the next useful potion.
                    </li>
                    <li>
                      They slow down the journey, but are the first people the others
                      seek out when the group is in hot water.
                    </li>
                    <li>
                      They think Magicians are reckless, but secretly admire how they fly
                      through the story without needing to bottle everything up for later.
                    </li>
                  </ul>
                </div>

                <div className="rounded-2xl border border-slate-300 bg-white/85 p-5 text-left shadow-sm">
                  <div className="mb-4 flex justify-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border border-slate-300 bg-slate-100 shadow-inner">
                      <img
                        src="/reader-roles/sage.svg"
                        alt="Sage icon"
                        className="h-12 w-12 object-contain opacity-80"
                      />
                    </div>
                  </div>

                  <div className="text-sm font-semibold text-stone-900">
                    The Sages
                  </div>
                  <div className="mt-1 text-sm text-stone-500">
                    aka selective looker-uppers
                  </div>

                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-stone-700">
                    <li>The peacekeepers of the reading journey.</li>
                    <li>
                      Known for sensing when to stop, examine something more closely, keep moving,
                      or run ahead.
                    </li>
                    <li>
                      Calm and practical.
                    </li>
                    <li>
                      They carry the map and guide the
                      others, noticing warning signs and avoiding places where one could easily
                      get stuck.
                    </li>
                    <li>
                      They have gotten good at ignoring the Alchemists and Magicians arguing
                      because they already believe they are the reason the reading journey keeps
                      moving forward.
                    </li>
                  </ul>
                </div>

                <div className="rounded-2xl border border-slate-300 bg-white/85 p-5 text-left shadow-sm">
                  <div className="mb-4 flex justify-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border border-slate-300 bg-slate-100 shadow-inner">
                      <img
                        src="/reader-roles/magician.svg"
                        alt="Magician icon"
                        className="h-12 w-12 object-contain opacity-80"
                      />
                    </div>
                  </div>

                  <div className="text-sm font-semibold text-stone-900">
                    The Magicians
                  </div>
                  <div className="mt-1 text-sm text-stone-500">
                    aka non-looker-uppers
                  </div>

                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-stone-700">
                    <li>
                      They believe wholeheartedly in the magic of the story and prefer to fly
                      forward without interruption.
                    </li>
                    <li>
                      They jump over unknown words with alarming confidence and glide over nasty
                      grammar with a swipe of their wands.
                    </li>
                    <li>
                      They are convinced the Alchemists waste far too much time, but are
                      suspiciously grateful whenever a potion is needed.
                    </li>
                    <li>
                      Deep down, they know that accurately made potions are essential for skilled magic, but they will absolutely pretend they can manage without all those ingredients.
                    </li>
                  </ul>
                </div>
              </div>
            </section>
          </>
        )}

        <div className="flex w-full justify-center">
          <button
            onClick={() => router.push("/")}
            className="rounded-full border border-slate-300 bg-white/75 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
          >
            Back to MEKURU site
          </button>
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
