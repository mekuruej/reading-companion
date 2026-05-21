// Profile Home
//

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type ProfileRow = {
  display_name: string | null;
  username: string | null;
  native_language: string | null;
  target_language: string | null;
  level: string | null;
  role: string | null;
};

type PublicProfileRow = {
  jlpt_level_public: string | null;
  favorite_genres: string[] | null;
  bio: string | null;
  public_name_choice: "display_name" | "username" | null;
};

const profileActions = [
  {
    title: "Edit Profile",
    href: "/community/profile/settings",
    description:
      "Update your reader details, reading level, favorite genres, bio, and public-facing profile choices.",
    className: "border-amber-200 bg-amber-50 hover:bg-amber-100/70",
    textClassName: "text-amber-950",
    descriptionClassName: "text-amber-900/75",
    arrowClassName: "bg-white/80 text-amber-900",
  },
];

function firstInitial(name: string) {
  return (name.trim()[0] ?? "M").toUpperCase();
}

export default function ProfileHubPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [publicProfile, setPublicProfile] = useState<PublicProfileRow | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfileHome() {
      setLoading(true);
      setErrorMsg("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) {
          if (!cancelled) {
            setProfile(null);
            setPublicProfile(null);
            setLoading(false);
          }
          return;
        }

        const [profileResult, publicProfileResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("display_name, username, native_language, target_language, level, role")
            .eq("id", user.id)
            .maybeSingle<ProfileRow>(),
          supabase
            .from("user_public_profile")
            .select("jlpt_level_public, favorite_genres, bio, public_name_choice")
            .eq("user_id", user.id)
            .maybeSingle<PublicProfileRow>(),
        ]);

        if (profileResult.error) throw profileResult.error;
        if (publicProfileResult.error) throw publicProfileResult.error;

        if (!cancelled) {
          setProfile(profileResult.data ?? null);
          setPublicProfile(publicProfileResult.data ?? null);
        }
      } catch (error: any) {
        if (!cancelled) {
          setErrorMsg(error?.message ?? "Could not load profile information.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadProfileHome();

    return () => {
      cancelled = true;
    };
  }, []);

  const displayName = profile?.display_name?.trim() || "";
  const username = profile?.username?.trim() || "";
  const publicNameChoice = publicProfile?.public_name_choice ?? "display_name";
  const profileName =
    publicNameChoice === "username"
      ? username || displayName || "My Mekuru Profile"
      : displayName || username || "My Mekuru Profile";

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-6">
      <div className="mx-auto max-w-6xl">
        {errorMsg ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
          <div className="h-32 bg-gradient-to-r from-sky-100 via-amber-50 to-emerald-100" />

          <div className="px-5 pb-6 sm:px-7">
            <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex items-end gap-4">
                <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-stone-100 text-3xl font-black text-stone-500 shadow-sm">
                  {firstInitial(profileName)}
                </div>

                <div className="pb-2">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">
                    Reader Profile
                  </div>
                  <h1 className="mt-1 text-3xl font-black text-stone-950">
                    {loading ? "Loading profile..." : profileName}
                  </h1>
                </div>
              </div>
            </div>

          </div>
        </div>

        <div className="mt-5">
          <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">
              Profile Tools
            </p>
            <h2 className="mt-2 text-xl font-black text-stone-950">
              Manage your profile
            </h2>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {username ? (
                <Link
                  href="/community/profile/preview"
                  className="block rounded-2xl border border-emerald-200 bg-emerald-50 p-4 transition hover:-translate-y-0.5 hover:bg-emerald-100/70 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-black text-emerald-950">
                        Preview Public Profile
                      </div>
                      <p className="mt-1 text-sm leading-6 text-emerald-900/80">
                        See the page other readers can see. Private account details are not shown.
                      </p>
                    </div>

                    <span className="rounded-full bg-white/80 px-3 py-1 text-sm font-black text-emerald-900">
                      →
                    </span>
                  </div>
                </Link>
              ) : (
                <Link
                  href="/community/profile/settings"
                  className="block rounded-2xl border border-amber-200 bg-amber-50 p-4 transition hover:-translate-y-0.5 hover:bg-amber-100/60 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-black text-amber-950">
                        Preview Public Profile
                      </div>
                      <p className="mt-1 text-sm leading-6 text-amber-900/80">
                        Add a username first so Mekuru can create your public profile link.
                      </p>
                    </div>

                    <span className="rounded-full bg-white/80 px-3 py-1 text-sm font-black text-amber-900">
                      Set up
                    </span>
                  </div>
                </Link>
              )}

              {profileActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className={`block rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${action.className}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className={`font-black ${action.textClassName}`}>
                        {action.title}
                      </div>
                      <p className={`mt-1 text-sm leading-6 ${action.descriptionClassName}`}>
                        {action.description}
                      </p>
                    </div>

                    <span className={`rounded-full px-3 py-1 text-sm font-black ${action.arrowClassName}`}>
                      →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-5 rounded-3xl border border-sky-100 bg-sky-50 p-5 text-sky-950 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] opacity-60">
            Privacy note
          </p>
          <p className="mt-2 text-sm leading-7 opacity-80">
            Basic reader identity can be public, while private reading data and personal details
            stay private by default. Use Preview Public Profile to check what other readers can see.
          </p>
        </section>
      </div>
    </main>
  );
}
