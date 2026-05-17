// App Dashboard
//

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/lib/supabaseClient";

export default function DashboardPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    let alive = true;

    async function loadSession() {
      const params = new URLSearchParams(window.location.search);
      const authCode = params.get("code");

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

      setIsLoggedIn(Boolean(session?.user));
      setCheckingSession(false);
    }

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;

      setIsLoggedIn(Boolean(session?.user));
      setCheckingSession(false);
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-100 text-slate-950">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 bg-cover opacity-[0.14]"
        style={{
          backgroundImage: "url('/mekuru-home-photo.jpg')",
          backgroundPosition: "72% center",
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 bg-slate-100/86 backdrop-blur-[1px]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 z-0 w-1/2 bg-gradient-to-r from-slate-100 via-slate-100/95 to-transparent"
      />

      <div className="relative z-10 flex flex-col items-center gap-10 px-6 py-12 text-center">
        <section className="grid w-full max-w-5xl items-center gap-5 lg:grid-cols-[1.25fr_0.75fr]">
          <img
            src="/mekuru-banner.png"
            alt="MEKURU banner"
            className="w-full rounded-2xl border border-slate-200 object-cover shadow-lg shadow-slate-300/40"
          />

          <div className="rounded-3xl border border-slate-200 bg-white/85 px-6 py-6 text-center shadow-sm">
            {checkingSession ? (
              <>
                <h2 className="text-3xl font-semibold">Welcome to Mekuru</h2>
                <p className="mt-3 text-gray-500">Signing you in...</p>
              </>
            ) : isLoggedIn ? (
              <>
                <h2 className="text-3xl font-semibold">Welcome to Mekuru</h2>
                <p className="mt-3 text-gray-500">
                  Every word carries the memory of where you met it.
                  <br />
                  ページをめくって、話しまくろう！
                </p>
                <button
                  onClick={() => router.push("/books")}
                  className="mt-5 w-full rounded-xl bg-slate-800 px-4 py-3 text-white shadow-md transition hover:-translate-y-0.5 hover:bg-slate-900 hover:shadow-lg"
                >
                  Go to My Library
                </button>

              </>
            ) : (
              <>
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
              </>
            )}
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
        <div className="flex w-full justify-center">
          <button
            onClick={() => router.push("/")}
            className="rounded-full border border-slate-300 bg-white/75 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
          >
            Back to MEKURU site
          </button>
        </div>
      </div>
    </main>
  );
}
