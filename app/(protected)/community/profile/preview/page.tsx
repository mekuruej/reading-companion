// Public Profile Preview
//

"use client";

import { useEffect, useMemo, useState } from "react";
import { findMekuruReadingLevel } from "@/components/profile/MekuruReadingLevelGuide";
import ProfileShell from "@/components/profile/ProfileShell";
import {
  emptyLibraryStudyColorTotals,
  fetchLibraryStudyColorTotals,
  type LibraryStudyColorTotals,
} from "@/lib/libraryStudyTotals";
import { supabase } from "@/lib/supabaseClient";
import ProfilePreviewErrorState from "./components/ProfilePreviewErrorState";
import ProfilePreviewHeader from "./components/ProfilePreviewHeader";
import ProfilePreviewStatsGrid from "./components/ProfilePreviewStatsGrid";
import ProfilePreviewAbilityColors from "./components/ProfilePreviewAbilityColors";
import ProfilePreviewBio from "./components/ProfilePreviewBio";
import ProfilePreviewCurrentBooks from "./components/ProfilePreviewCurrentBooks";
import ProfilePreviewDetailsGrid from "./components/ProfilePreviewDetailsGrid";
import ProfilePreviewActions from "./components/ProfilePreviewActions";

type ProfileRow = {
  display_name: string | null;
  username: string | null;
  level: string | null;
  target_language: string | null;
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
    description: "Reading Gate",
    key: "green",
    dotClass: "bg-emerald-500",
  },
  {
    label: "Blue",
    description: "Meaning Gate",
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
            .select("display_name, username, level, target_language")
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
    { label: "Target Language", value: displayValue(profile?.target_language, "Japanese") },
  ];
  const readingLevel = findMekuruReadingLevel(profile?.level);

  return (
    <ProfileShell
      title="Public Profile Preview"
      description="This preview shows the reader-facing information other people can see. Private account details are not shown here."
    >
      <div className="mx-auto max-w-4xl space-y-4">
        <ProfilePreviewErrorState message={errorMsg} />

        <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
          <ProfilePreviewHeader
            loading={loading}
            initial={firstInitial(publicName)}
            publicName={publicName}
            usernameLabel={username ? `@${username}` : "No username set"}
            targetLanguageLabel={displayValue(profile?.target_language, "Japanese")}
          />

          <div className="px-5 pb-6 sm:px-7">

            <ProfilePreviewStatsGrid
              loading={loading}
              publicStats={publicStats}
              readingLevel={readingLevel}
              fallbackLevelLabel={displayValue(profile?.level, "Not set")}
            />

            <ProfilePreviewAbilityColors
              loading={loading}
              items={publicAbilityColors.map((color) => ({
                key: color.key,
                label: color.label,
                description: color.description,
                dotClass: color.dotClass,
                value: formatCount(colorTotals[color.key]),
              }))}
            />

            <ProfilePreviewBio
              bio={displayValue(
                publicProfile?.bio,
                "No public bio yet. Add one from Edit Profile when you are ready."
              )}
            />

            <ProfilePreviewCurrentBooks books={currentBooks} />

            <ProfilePreviewDetailsGrid
              publicLevelLabel={displayValue(publicProfile?.jlpt_level_public, "Hidden")}
              favoriteGenres={favoriteGenres}
            />
          </div>
        </section>

        <ProfilePreviewActions settingsHref="/community/profile/settings" />
      </div>
    </ProfileShell>
  );
}
