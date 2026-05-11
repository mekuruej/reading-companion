// Public Profile Preview
//

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ProfileShell from "@/components/profile/ProfileShell";
import {
  emptyLibraryStudyColorTotals,
  fetchLibraryStudyColorTotals,
  type LibraryStudyColorTotals,
} from "@/lib/libraryStudyTotals";
import { supabase } from "@/lib/supabaseClient";

type ProfileRow = {
  display_name: string | null;
  username: string | null;
  level: string | null;
  target_language: string | null;
  role: string | null;
};

type PublicProfileRow = {
  jlpt_level_public: string | null;
  favorite_genres: string[] | null;
  bio: string | null;
  public_name_choice: "display_name" | "username" | null;
};

type CurrentBookPreview = {
  id: string;
  title: string;
  author: string | null;
  cover_url: string | null;
};

function firstInitial(name: string) {
  return (name.trim()[0] ?? "M").toUpperCase();
}

function displayValue(value: string | null | undefined, fallback = "Not shown") {
  return value?.trim() || fallback;
}

function formatCount(value: number | null | undefined) {
  if (value == null) return "—";
  return value.toLocaleString();
}

const publicAbilityColors = [
  {
    label: "Green",
    description: "Reading passed",
    key: "green",
    dotClass: "bg-emerald-500",
  },
  {
    label: "Blue",
    description: "Meaning passed",
    key: "blue",
    dotClass: "bg-sky-500",
  },
  {
    label: "Purple",
    description: "Mastered",
    key: "purple",
    dotClass: "bg-violet-500",
  },
] as const;

export default function PublicProfilePreviewPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [publicProfile, setPublicProfile] = useState<PublicProfileRow | null>(null);
  const [bookCount, setBookCount] = useState<number | null>(null);
  const [libraryWordCount, setLibraryWordCount] = useState<number | null>(null);
  const [currentBooks, setCurrentBooks] = useState<CurrentBookPreview[]>([]);
  const [colorTotals, setColorTotals] = useState<LibraryStudyColorTotals>(
    emptyLibraryStudyColorTotals()
  );

  useEffect(() => {
    let cancelled = false;

    async function loadPreview() {
      setLoading(true);
      setErrorMsg("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) {
          setErrorMsg("Please sign in again.");
          return;
        }

        const [
          profileResult,
          publicProfileResult,
          bookCountResult,
          libraryWordCountResult,
          currentBooksResult,
          colorTotalsResult,
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select("display_name, username, level, target_language, role")
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
          supabase
            .from("user_books")
            .select(
              `
              id,
              books:book_id (
                title,
                author,
                cover_url
              )
            `
            )
            .eq("user_id", user.id)
            .not("started_at", "is", null)
            .is("finished_at", null)
            .is("dnf_at", null)
            .or("is_teacher_prep.is.null,is_teacher_prep.eq.false")
            .order("started_at", { ascending: false })
            .limit(3),
          fetchLibraryStudyColorTotals(user.id).catch((error) => {
            console.error("Error loading public profile color totals:", error);
            return emptyLibraryStudyColorTotals();
          }),
        ]);

        if (profileResult.error) throw profileResult.error;
        if (publicProfileResult.error) throw publicProfileResult.error;
        if (bookCountResult.error) throw bookCountResult.error;
        if (libraryWordCountResult.error) throw libraryWordCountResult.error;
        if (currentBooksResult.error) throw currentBooksResult.error;

        if (!cancelled) {
          const normalizedCurrentBooks = ((currentBooksResult.data ?? []) as any[])
            .map((row) => ({
              id: String(row.id),
              title: String(row.books?.title ?? "").trim(),
              author: row.books?.author ? String(row.books.author) : null,
              cover_url: row.books?.cover_url ? String(row.books.cover_url) : null,
            }))
            .filter((book) => book.title);

          setProfile(profileResult.data ?? null);
          setPublicProfile(publicProfileResult.data ?? null);
          setBookCount(bookCountResult.count ?? 0);
          setLibraryWordCount(libraryWordCountResult.count ?? 0);
          setCurrentBooks(normalizedCurrentBooks);
          setColorTotals(colorTotalsResult);
        }
      } catch (error: any) {
        if (!cancelled) {
          setErrorMsg(error?.message ?? "Could not load public profile preview.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadPreview();

    return () => {
      cancelled = true;
    };
  }, []);

  const displayName = profile?.display_name?.trim() || "";
  const username = profile?.username?.trim() || "";
  const publicNameChoice = publicProfile?.public_name_choice ?? "display_name";
  const publicName =
    publicNameChoice === "username"
      ? username || displayName || "Mekuru Reader"
      : displayName || username || "Mekuru Reader";
  const favoriteGenres = useMemo(
    () => (publicProfile?.favorite_genres ?? []).filter(Boolean),
    [publicProfile?.favorite_genres]
  );
  const publicStats = [
    { label: "Books", value: bookCount == null ? "—" : bookCount.toLocaleString() },
    {
      label: "Library Words",
      value: libraryWordCount == null ? "—" : libraryWordCount.toLocaleString(),
    },
    { label: "Level", value: displayValue(profile?.level, "Not set") },
    { label: "Target Language", value: displayValue(profile?.target_language, "Japanese") },
  ];

  return (
    <ProfileShell
      title="Public Profile Preview"
      description="This preview shows the reader-facing information other people can see. Private account details like email and native language are not shown here."
    >
      <div className="mx-auto max-w-4xl space-y-4">
        {errorMsg ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
          <div className="h-28 bg-gradient-to-r from-sky-100 via-amber-50 to-emerald-100" />

          <div className="px-5 pb-6 sm:px-7">
            <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-stone-100 text-2xl font-black text-stone-500 shadow-sm">
                {loading ? "..." : firstInitial(publicName)}
              </div>

              <div className="pb-2">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">
                  Public Reader Profile
                </div>
                <h1 className="mt-1 text-3xl font-black text-stone-950">
                  {loading ? "Loading preview..." : publicName}
                </h1>
                <p className="mt-1 text-sm text-stone-500">
                  {username ? `@${username}` : "No username set"} ·{" "}
                  {displayValue(profile?.target_language, "Japanese")} reader
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              {publicStats.map((stat) => (
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

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {publicAbilityColors.map((color) => (
                <div
                  key={color.key}
                  className="rounded-2xl border border-stone-100 bg-white px-4 py-3 shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${color.dotClass}`} />
                    <div className="text-xs font-black uppercase tracking-[0.16em] text-stone-400">
                      {color.label}
                    </div>
                  </div>
                  <div className="mt-2 text-2xl font-black text-stone-950">
                    {loading ? "—" : formatCount(colorTotals[color.key])}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-stone-500">
                    {color.description}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl bg-stone-50 p-4 text-sm leading-7 text-stone-600">
              {displayValue(
                publicProfile?.bio,
                "No public bio yet. Add one from Edit Profile when you are ready."
              )}
            </div>

            {currentBooks.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-stone-100 bg-white p-4">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-stone-400">
                  Currently reading
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {currentBooks.map((book) => (
                    <div
                      key={book.id}
                      className="flex gap-3 rounded-2xl border border-stone-100 bg-stone-50 p-3"
                    >
                      <div className="h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-stone-200">
                        {book.cover_url ? (
                          <img
                            src={book.cover_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <div className="line-clamp-2 text-sm font-black leading-5 text-stone-900">
                          {book.title}
                        </div>
                        {book.author ? (
                          <div className="mt-1 line-clamp-2 text-xs leading-5 text-stone-500">
                            {book.author}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-stone-100 p-4">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-stone-400">
                  Public level
                </div>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  {displayValue(publicProfile?.jlpt_level_public, "Hidden")}
                </p>
              </div>

              <div className="rounded-2xl border border-stone-100 p-4">
                <div className="text-xs font-black uppercase tracking-[0.16em] text-stone-400">
                  Role
                </div>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  {displayValue(profile?.role, "member")}
                </p>
              </div>

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
                  <p className="mt-2 text-sm leading-6 text-stone-600">Not shown yet.</p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-sky-100 bg-sky-50 p-5 text-sky-950 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] opacity-60">
            Not public here
          </p>
          <p className="mt-2 text-sm leading-7 opacity-80">
            Email, login details, native language, detailed stats, and private reading data are not
            shown in this preview.
          </p>
          <Link
            href="/community/profile/setup"
            className="mt-4 inline-flex rounded-xl border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-sky-950 transition hover:bg-sky-100"
          >
            Edit public details
          </Link>
        </section>
      </div>
    </ProfileShell>
  );
}
