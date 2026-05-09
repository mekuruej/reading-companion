// Profile Home
//

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  emptyLibraryStudyColorTotals,
  fetchLibraryStudyColorTotals,
  type LibraryStudyColorTotals,
} from "@/lib/libraryStudyTotals";
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
    title: "Account Settings",
    href: "/community/profile/account",
    description: "See your private login email and account-level details.",
  },
  {
    title: "Edit Profile",
    href: "/community/profile/setup",
    description: "Update your display details, level, bio, and public-facing profile basics.",
  },
  {
    title: "Edit Reading Profile",
    href: "/community/profile/reading",
    description: "Adjust reading support, encounter stages, and Ability Check settings.",
  },
  {
    title: "Social Profile",
    href: "/community/profile/social",
    description: "Future home for public sharing, community preferences, and reader identity.",
  },
];

function formatCount(value: number | null) {
  if (value == null) return "—";
  return value.toLocaleString();
}

function firstInitial(name: string) {
  return (name.trim()[0] ?? "M").toUpperCase();
}

function normalizeLevel(level: string | null | undefined) {
  return level?.trim() || "Not set";
}

export default function ProfileHubPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [publicProfile, setPublicProfile] = useState<PublicProfileRow | null>(null);
  const [accountEmail, setAccountEmail] = useState("");
  const [bookCount, setBookCount] = useState<number | null>(null);
  const [libraryWordCount, setLibraryWordCount] = useState<number | null>(null);
  const [colorTotals, setColorTotals] = useState<LibraryStudyColorTotals>(
    emptyLibraryStudyColorTotals()
  );

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

        const [
          profileResult,
          publicProfileResult,
          bookCountResult,
          libraryWordCountResult,
          colorResult,
        ] = await Promise.all([
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
          supabase
            .from("user_books")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),
          supabase
            .from("user_library_word_summaries")
            .select("study_identity_key", { count: "exact", head: true })
            .eq("user_id", user.id),
          fetchLibraryStudyColorTotals(user.id).catch((error) => {
            console.error("Error loading profile color totals:", error);
            return emptyLibraryStudyColorTotals();
          }),
        ]);

        if (profileResult.error) throw profileResult.error;
        if (publicProfileResult.error) throw publicProfileResult.error;
        if (bookCountResult.error) throw bookCountResult.error;
        if (libraryWordCountResult.error) throw libraryWordCountResult.error;

        if (!cancelled) {
          setAccountEmail(user.email ?? "");
          setProfile(profileResult.data ?? null);
          setPublicProfile(publicProfileResult.data ?? null);
          setBookCount(bookCountResult.count ?? 0);
          setLibraryWordCount(libraryWordCountResult.count ?? 0);
          setColorTotals(colorResult);
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
  const userHandle = username ? `@${username}` : "No username set";
  const favoriteGenres = useMemo(
    () => (publicProfile?.favorite_genres ?? []).filter(Boolean),
    [publicProfile?.favorite_genres]
  );

  const profileStats = [
    { label: "Books", value: formatCount(bookCount) },
    { label: "Library Words", value: formatCount(libraryWordCount) },
    { label: "Level", value: normalizeLevel(profile?.level) },
    { label: "Native Language", value: profile?.native_language?.trim() || "Not set" },
  ];

  const abilityColorStats = [
    {
      label: "Green",
      value: formatCount(colorTotals.green),
      description: "Reading passed",
      dotClass: "bg-emerald-500",
    },
    {
      label: "Blue",
      value: formatCount(colorTotals.blue),
      description: "Meaning passed",
      dotClass: "bg-sky-500",
    },
    {
      label: "Purple",
      value: formatCount(colorTotals.purple),
      description: "Mastered",
      dotClass: "bg-violet-500",
    },
  ];

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
                  <p className="mt-1 text-sm text-stone-500">
                    {userHandle} · {normalizeLevel(profile?.level)} ·{" "}
                    {profile?.target_language?.trim() || "Japanese"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              {profileStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3"
                >
                  <div className="text-xs font-black uppercase tracking-[0.16em] text-stone-400">
                    {stat.label}
                  </div>
                  <div className="mt-1 text-lg font-black text-stone-900">
                    {loading ? "—" : stat.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {abilityColorStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-stone-100 bg-white px-4 py-3 shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${stat.dotClass}`} />
                    <div className="text-xs font-black uppercase tracking-[0.16em] text-stone-400">
                      {stat.label}
                    </div>
                  </div>

                  <div className="mt-2 text-2xl font-black text-stone-950">
                    {loading ? "—" : stat.value}
                  </div>

                  <div className="mt-1 text-xs font-semibold text-stone-500">
                    {stat.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">
                About Me
              </p>
              <h2 className="mt-2 text-xl font-black text-stone-950">
                Public reader profile
              </h2>
            </div>

            <div className="mt-4 rounded-2xl bg-stone-50 p-4 text-sm leading-7 text-stone-600">
              {publicProfile?.bio?.trim()
                ? publicProfile.bio.trim()
                : "Add a short reader bio, your favorite book types, and the kind of Japanese books you want to grow into."}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-stone-100 p-4">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-stone-400">
                  Favorite genres
                </div>
                {favoriteGenres.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {favoriteGenres.map((genre) => (
                      <span
                        key={genre}
                        className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold text-stone-600"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    No favorite genres added yet.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-stone-100 p-4">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-stone-400">
                  Public level
                </div>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  {publicProfile?.jlpt_level_public?.trim() || "Hidden"}
                </p>
              </div>

              <div className="rounded-2xl border border-stone-100 p-4">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-stone-400">
                  Role
                </div>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  {profile?.role?.trim() || "member"}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">
              Profile Tools
            </p>
            <h2 className="mt-2 text-xl font-black text-stone-950">
              Manage your profile
            </h2>

            <div className="mt-4 space-y-3">
              {accountEmail ? (
                <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-950">
                  <div className="text-xs font-black uppercase tracking-[0.16em] opacity-60">
                    Signed in as
                  </div>
                  <div className="mt-1 break-all font-semibold">{accountEmail}</div>
                </div>
              ) : null}

              {profileActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="block rounded-2xl border border-stone-200 bg-white p-4 transition hover:-translate-y-0.5 hover:bg-stone-50 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-black text-stone-900">
                        {action.title}
                      </div>
                      <p className="mt-1 text-sm leading-6 text-stone-500">
                        {action.description}
                      </p>
                    </div>

                    <span className="rounded-full bg-stone-100 px-3 py-1 text-sm font-black text-stone-600">
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
            stay private by default. Use Edit Profile to choose what other readers see.
          </p>
        </section>
      </div>
    </main>
  );
}
