// Profile Home
//

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { findMekuruReadingLevel } from "@/components/profile/MekuruReadingLevelGuide";
import { getAppAccessStatus } from "@/lib/access/appAccess";
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
  is_super_teacher: boolean | null;
  app_access_type: string | null;
  app_access_expires_at: string | null;
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

const colorHighlights = [
  {
    key: "green",
    label: "Green",
    description: "Reading Gate",
    className: "bg-emerald-500",
  },
  {
    key: "blue",
    label: "Blue",
    description: "Meaning Gate",
    className: "bg-sky-500",
  },
  {
    key: "purple",
    label: "Purple",
    description: "Mastered",
    className: "bg-violet-500",
  },
] as const;

function firstInitial(name: string) {
  return (name.trim()[0] ?? "M").toUpperCase();
}

function formatDate(value: string | null | undefined) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function displayValue(value: string | null | undefined, fallback = "Not set") {
  return value?.trim() || fallback;
}

function formatCount(value: number | null | undefined) {
  if (value == null) return "—";
  return value.toLocaleString();
}

function AccessLabel({
  profile,
}: {
  profile: ProfileRow | null;
}) {
  const appAccessStatus = profile ? getAppAccessStatus(profile) : null;
  const trialEndsAt = profile?.app_access_expires_at ?? null;

  if (!appAccessStatus) {
    return (
      <p className="mt-2 text-sm leading-6 text-stone-600">
        Sign in again to refresh your current access details.
      </p>
    );
  }

  if (appAccessStatus.isTrialActive) {
    return (
      <>
        <h2 className="mt-2 text-2xl font-black text-stone-950">
          Reading Access trial active
        </h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          {appAccessStatus.daysRemaining === 1
            ? "1 day remaining"
            : `${appAccessStatus.daysRemaining ?? 0} days remaining`}
          {trialEndsAt ? `, through ${formatDate(trialEndsAt)}.` : "."}
        </p>
      </>
    );
  }

  if (appAccessStatus.hasFullAccess) {
    return (
      <>
        <h2 className="mt-2 text-2xl font-black text-stone-950">
          Reading Access active
        </h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Your saved-word and reading study tools are available.
        </p>
      </>
    );
  }

  return (
    <>
      <h2 className="mt-2 text-2xl font-black text-stone-950">
        Free reading profile
      </h2>
      <p className="mt-2 text-sm leading-6 text-stone-600">
        Your library, reading records, and saved vocabulary archive stay here.
      </p>
    </>
  );
}

function ReaderAvatar({ initial }: { initial: string }) {
  return (
    <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-[2rem] border-4 border-white bg-stone-950 text-5xl font-black text-white shadow-xl md:h-40 md:w-40">
      {initial}
    </div>
  );
}

function HighlightCard({
  label,
  value,
  detail,
  tone = "stone",
}: {
  label: string;
  value: string | number | null | undefined;
  detail?: string | null;
  tone?: "amber" | "emerald" | "sky" | "violet" | "stone";
}) {
  const toneClass =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-950"
      : tone === "emerald"
        ? "border-emerald-200 bg-emerald-50 text-emerald-950"
        : tone === "sky"
          ? "border-sky-200 bg-sky-50 text-sky-950"
          : tone === "violet"
            ? "border-violet-200 bg-violet-50 text-violet-950"
            : "border-stone-200 bg-white text-stone-950";

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${toneClass}`}>
      <p className="text-xs font-black uppercase tracking-[0.18em] opacity-60">{label}</p>
      <p className="mt-2 text-2xl font-black leading-tight">{value ?? "—"}</p>
      {detail ? <p className="mt-2 text-sm font-semibold leading-6 opacity-75">{detail}</p> : null}
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">{label}</p>
      <p className="mt-2 text-lg font-black text-stone-950">{value ?? "Not set"}</p>
    </div>
  );
}

function ProfileSection({
  eyebrow,
  title,
  description,
  children,
  className = "",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-sm ${className}`}>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-500">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-black text-stone-950">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">{description}</p>
      ) : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ActionCard({
  href,
  title,
  description,
  tone,
}: {
  href: string;
  title: string;
  description: string;
  tone: "emerald" | "amber";
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-950 hover:bg-emerald-100/70"
      : "border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-100/70";

  return (
    <Link
      href={href}
      className={`block rounded-3xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${toneClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-black">{title}</div>
          <p className="mt-2 text-sm font-semibold leading-6 opacity-75">{description}</p>
        </div>
        <span className="rounded-full bg-white/80 px-3 py-1 text-sm font-black">→</span>
      </div>
    </Link>
  );
}

function CurrentBookCard({ book }: { book: CurrentBookPreview }) {
  return (
    <Link
      href={`/books/${book.id}`}
      className="grid grid-cols-[72px_minmax(0,1fr)] gap-4 rounded-3xl border border-white/70 bg-white/85 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      {book.cover_url ? (
        <img
          src={book.cover_url}
          alt={`${book.title} cover`}
          className="aspect-[2/3] w-full rounded-2xl object-cover shadow-sm ring-1 ring-black/10"
        />
      ) : (
        <div className="flex aspect-[2/3] w-full items-center justify-center rounded-2xl bg-stone-200 text-xs font-black text-stone-500">
          Book
        </div>
      )}
      <div className="min-w-0 py-1">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-stone-400">Reading</p>
        <h3 className="mt-2 line-clamp-2 text-lg font-black leading-tight text-stone-950">
          {book.title}
        </h3>
        {book.author ? (
          <p className="mt-2 truncate text-sm font-semibold text-stone-500">{book.author}</p>
        ) : null}
      </div>
    </Link>
  );
}

export default function ProfileHubPage() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [publicProfile, setPublicProfile] = useState<PublicProfileRow | null>(null);
  const [bookCount, setBookCount] = useState<number | null>(null);
  const [finishedBookCount, setFinishedBookCount] = useState<number | null>(null);
  const [libraryWordCount, setLibraryWordCount] = useState<number | null>(null);
  const [currentBooks, setCurrentBooks] = useState<CurrentBookPreview[]>([]);
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
          finishedBookCountResult,
          libraryWordCountResult,
          currentBooksResult,
          colorTotalsResult,
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select(
              "display_name, username, native_language, target_language, level, role, is_super_teacher, app_access_type, app_access_expires_at"
            )
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
            .eq("user_id", user.id)
            .or("is_teacher_prep.is.null,is_teacher_prep.eq.false"),
          supabase
            .from("user_books")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .not("finished_at", "is", null)
            .or("is_teacher_prep.is.null,is_teacher_prep.eq.false"),
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
            .limit(4),
          fetchLibraryStudyColorTotals(user.id).catch((error) => {
            console.error("Error loading reading profile color totals:", error);
            return emptyLibraryStudyColorTotals();
          }),
        ]);

        if (profileResult.error) throw profileResult.error;
        if (publicProfileResult.error) throw publicProfileResult.error;
        if (bookCountResult.error) throw bookCountResult.error;
        if (finishedBookCountResult.error) throw finishedBookCountResult.error;
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
          setFinishedBookCount(finishedBookCountResult.count ?? 0);
          setLibraryWordCount(libraryWordCountResult.count ?? 0);
          setCurrentBooks(normalizedCurrentBooks);
          setColorTotals(colorTotalsResult);
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
      ? username || displayName || "My Reading Profile"
      : displayName || username || "My Reading Profile";
  const favoriteGenres = useMemo(
    () => (publicProfile?.favorite_genres ?? []).filter(Boolean),
    [publicProfile?.favorite_genres]
  );
  const readingLevel = findMekuruReadingLevel(profile?.level);
  const targetLanguage = displayValue(profile?.target_language, "Japanese");
  const nativeLanguage = displayValue(profile?.native_language);
  const publicJlptLevel = displayValue(publicProfile?.jlpt_level_public, "Hidden");
  const heroFacts = [
    username ? `@${username}` : null,
    targetLanguage,
    readingLevel?.plain ?? profile?.level,
  ].filter(Boolean);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f5efe7] px-5 py-8">
        <div className="mx-auto max-w-5xl rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-black text-stone-600">Loading reading profile...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5efe7] px-5 py-8 text-stone-950">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/library"
          className="inline-flex text-sm font-black text-stone-600 transition hover:text-stone-950"
        >
          &larr; Back to Library
        </Link>

        {errorMsg ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        ) : null}

        <section className="mt-5 overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-sm">
          <div className="relative bg-gradient-to-br from-sky-100 via-amber-50 to-emerald-100 p-6 md:p-10">
            <div className="grid gap-8 md:grid-cols-[180px_minmax(0,1fr)] md:items-end">
              <ReaderAvatar initial={firstInitial(profileName)} />

              <div>
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-stone-600 shadow-sm">
                    My Reading Profile
                  </span>
                  <span className="rounded-full bg-stone-950 px-3 py-1 text-xs font-black text-white shadow-sm">
                    Private View
                  </span>
                </div>

                <h1 className="text-4xl font-black leading-tight text-stone-950 md:text-6xl">
                  {profileName}
                </h1>

                <p className="mt-5 max-w-3xl text-lg font-semibold leading-8 text-stone-700">
                  A living profile of your library, saved words, reading level, and current books.
                </p>

                {heroFacts.length > 0 ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {heroFacts.map((fact) => (
                      <span
                        key={fact}
                        className="rounded-full bg-white/75 px-4 py-2 text-sm font-black text-stone-700 shadow-sm"
                      >
                        {fact}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <HighlightCard
            label="Books"
            value={formatCount(bookCount)}
            detail="Books in your library"
            tone="amber"
          />
          <HighlightCard
            label="Finished"
            value={formatCount(finishedBookCount)}
            detail="Completed books"
            tone="emerald"
          />
          <HighlightCard
            label="Library Words"
            value={formatCount(libraryWordCount)}
            detail="Saved vocabulary archive"
            tone="sky"
          />
          <HighlightCard
            label="Reading Level"
            value={readingLevel?.value ?? displayValue(profile?.level)}
            detail={readingLevel?.plain ?? "Mekuru reader level"}
            tone="violet"
          />
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <ProfileSection
            eyebrow="Reading Identity"
            title="Reader Details"
            description="These are your current reader profile fields. Public profile choices are still managed separately."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailCard label="Target Language" value={targetLanguage} />
              <DetailCard label="Native Language" value={nativeLanguage} />
              <DetailCard label="Public JLPT Level" value={publicJlptLevel} />
              <DetailCard label="Public Name" value={publicNameChoice === "username" ? "Username" : "Display name"} />
            </div>

            {favoriteGenres.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {favoriteGenres.map((genre) => (
                  <span
                    key={genre}
                    className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-black text-stone-700"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            ) : null}
          </ProfileSection>

          <section className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-500">
              Access
            </p>
            <AccessLabel profile={profile} />
          </section>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <ProfileSection
            eyebrow="Word Colors"
            title="Vocabulary Progress"
            description="A quick look at the colors currently forming across your saved book vocabulary."
          >
            <div className="grid gap-3 sm:grid-cols-3">
              {colorHighlights.map((color) => (
                <div
                  key={color.key}
                  className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${color.className}`} />
                    <p className="text-sm font-black text-stone-950">{color.label}</p>
                  </div>
                  <p className="mt-3 text-3xl font-black text-stone-950">
                    {formatCount(colorTotals[color.key])}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-stone-500">{color.description}</p>
                </div>
              ))}
            </div>
          </ProfileSection>

          <ProfileSection
            eyebrow="Currently Reading"
            title="Books in Progress"
            description="The books you have started and have not finished yet."
          >
            {currentBooks.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {currentBooks.map((book) => (
                  <CurrentBookCard key={book.id} book={book} />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-white/70 bg-white/85 p-5 text-sm font-semibold leading-6 text-stone-600 shadow-sm">
                No current books yet. Start a book from your library and it will appear here.
              </div>
            )}
          </ProfileSection>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          <ProfileSection
            eyebrow="Reader Bio"
            title="Profile Notes"
            description="This is the reader-facing bio saved in your profile settings."
          >
            <p className="rounded-3xl border border-white/70 bg-white/85 p-5 text-sm leading-7 text-stone-700 shadow-sm">
              {publicProfile?.bio?.trim() || "No profile bio yet. Add one when you want this page to feel more personal."}
            </p>
          </ProfileSection>

          <ProfileSection
            eyebrow="Profile Tools"
            title="Edit Profile"
            description="Update the reader details that shape this profile page."
          >
            <div className="grid gap-3">
              <ActionCard
                href="/community/profile/settings"
                title="Edit Profile"
                description="Update your reader details, level, favorite genres, and bio."
                tone="amber"
              />
            </div>
          </ProfileSection>
        </section>
      </div>
    </main>
  );
}
