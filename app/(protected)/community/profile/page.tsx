"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppearanceSettings from "@/components/appearance/AppearanceSettings";
import ProfileReadingStatistics, { type ProfileRow } from "./ProfileReadingStatistics";
import { useProfileOwner } from "@/lib/profile/useProfileOwner";
import { loadPrivateReadingSummary } from "@/lib/profile/loadPrivateReadingSummary";
import ProfileEditor from "./ProfileEditor";
import { supabase } from "@/lib/supabaseClient";

type PrivateProfileDetails = { bio: string | null; favorite_genres: string[] | null };

type ProfileSummary = {
  readToday: boolean | null;
  currentlyReading: number | null;
  sessionsWithTimeLoggedThisMonth: number | null;
  booksFinished: number | null;
};

const EMPTY_SUMMARY: ProfileSummary = {
  readToday: null,
  currentlyReading: null,
  sessionsWithTimeLoggedThisMonth: null,
  booksFinished: null,
};

function firstInitial(name: string) {
  return name.trim()[0]?.toLocaleUpperCase() ?? "M";
}

function ReaderAvatar({ initial }: { initial: string }) {
  return (
    <div
      aria-label={`Profile image placeholder with the initial ${initial}`}
      className="flex h-28 w-28 shrink-0 items-center justify-center rounded-[2rem] border-4 border-white bg-stone-950 text-5xl font-black text-white shadow-lg sm:h-32 sm:w-32"
    >
      {initial}
    </div>
  );
}

function SummaryValue({ value }: { value: number | null }) {
  return <strong className="ml-1 font-black text-stone-900">{value == null ? "—" : value.toLocaleString()}</strong>;
}

function UnifiedProfile() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ownerId, error: authError, isCurrentOwner } = useProfileOwner();
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [summaryError, setSummaryError] = useState("");
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loadedOwner, setLoadedOwner] = useState<string | null>(null);
  const [privateDetails, setPrivateDetails] = useState<PrivateProfileDetails | null>(null);
  const [detailsError, setDetailsError] = useState("");
  const [summary, setSummary] = useState<ProfileSummary>(EMPTY_SUMMARY);
  const [editing, setEditing] = useState(false);
  const [reloadVersion, setReloadVersion] = useState(0);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  useEffect(() => { setEditing(searchParams.get("edit") === "1"); }, [searchParams]);
  useEffect(() => {
    if (!editing && restoreFocus.current && !loading) {
      editButtonRef.current?.focus();
      restoreFocus.current = false;
    }
  }, [editing, loading]);
  function exitEditor() {
    restoreFocus.current = true;
    // Reload confirmed server values before restoring focus to the rebuilt view.
    setLoading(true);
    setEditing(false);
    router.replace("/community/profile", { scroll: false });
    setReloadVersion(version => version + 1);
  }
  useEffect(() => {
    let active = true;
    const current = () => active && !!ownerId && isCurrentOwner(ownerId);
    setProfile(null); setLoadedOwner(null); setPrivateDetails(null);
    setProfileError(""); setDetailsError(""); setSummaryError(""); setSummary(EMPTY_SUMMARY);
    if (!ownerId) { setLoading(false); return () => { active = false; }; }
    setLoading(true);
    void (async () => {
      try {
        const [profileResult, detailsResult] = await Promise.all([
          supabase.from("profiles").select("display_name, username, native_language, target_language, japanese_learning_enabled, level, role, is_super_teacher, app_access_type, app_access_expires_at").eq("id", ownerId).maybeSingle<ProfileRow>(),
          supabase.from("user_public_profile").select("bio, favorite_genres").eq("user_id", ownerId).maybeSingle<PrivateProfileDetails>(),
        ]);
        if (!current()) return;
        if (profileResult.error || !profileResult.data) throw new Error("Could not load your profile. Please reload and try again.");
        setProfile(profileResult.data); setLoadedOwner(ownerId);
        if (detailsResult.error) setDetailsError("Reader-profile details could not be loaded.");
        else setPrivateDetails(detailsResult.data);
      } catch { if (current()) setProfileError("Could not load your profile. Please reload and try again."); }
      finally { if (current()) setLoading(false); }
    })();
    void loadPrivateReadingSummary(supabase, ownerId).then(result => {
      if (current()) setSummary(result);
    }).catch(() => { if (current()) setSummaryError("Reading activity summary is temporarily unavailable."); });
    return () => { active = false; };
  }, [ownerId, reloadVersion, isCurrentOwner]);

  const displayName = profile?.display_name?.trim() ?? "";
  const username = profile?.username?.trim() ?? "";
  const profileName = displayName || username || "My Profile";
  const bio = privateDetails?.bio?.trim() ?? "";

  if (authError) return <main className="p-6" role="alert">Could not confirm your session. Please reload and try again.</main>;
  if (ownerId === null) return <main className="p-6"><Link href="/login">Please sign in to view your profile.</Link></main>;
  if (loading || ownerId === undefined || (!!profile && loadedOwner !== ownerId)) {
    return (
      <main className="min-h-screen px-5 py-10">
        <div className="mx-auto max-w-4xl rounded-3xl border border-stone-200 bg-white p-8 text-center text-sm font-semibold text-stone-600">
          Loading your profile…
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-5 py-8 text-stone-950">
      <div className="mx-auto max-w-4xl">
        <Link href="/books" className="text-sm font-semibold text-stone-600 hover:text-stone-950">
          ← Back to My Library
        </Link>

        {profileError ? (
          <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            We couldn’t load your profile. {profileError}
          </div>
        ) : null}

        {editing && ownerId && profile && loadedOwner === ownerId ? (
          <div className="mt-5">
            <ProfileEditor
              key={ownerId}
              ownerId={ownerId}
              isCurrentOwner={isCurrentOwner}
              onCancel={exitEditor}
              onSaved={exitEditor}
            />
          </div>
        ) : (
          <>
            <section className="mt-5 rounded-[2rem] border border-white/80 bg-white p-6 shadow-sm sm:p-9">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
                <ReaderAvatar initial={firstInitial(profileName)} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-500">My Profile</p>
                  <h1 className="mt-2 break-words text-3xl font-black tracking-tight text-stone-950 sm:text-4xl">
                    {displayName || "Welcome to your profile"}
                  </h1>
                  {username ? <p className="mt-1 text-base font-semibold text-stone-500">@{username}</p> : null}
                  <p className="mt-3 text-sm text-stone-500">Manage your account settings and reader-profile information here.</p>
                </div>
                <button
                  type="button"
                  ref={editButtonRef}
                  disabled={!profile || loadedOwner !== ownerId}
                  onClick={() => { setEditing(true); router.replace("/community/profile?edit=1", { scroll: false }); }}
                  className="inline-flex shrink-0 items-center justify-center rounded-xl bg-stone-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-600 focus-visible:ring-offset-2"
                >
                  Edit Profile
                </button>
              </div>

              <div className="mt-8 space-y-4 border-t border-stone-100 pt-6">
                <section aria-labelledby="profile-about-heading">
                  <h2 id="profile-about-heading" className="text-sm font-black text-stone-800">About me</h2>
                  {bio ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-stone-700">{bio}</p>
                  ) : detailsError ? (
                    <p className="mt-2 text-sm leading-6 text-stone-400">{detailsError}</p>
                  ) : (
                    <p className="mt-2 text-sm leading-6 text-stone-400">Add a few words about yourself whenever you like.</p>
                  )}
                </section>
                <section aria-label="Favorite genres"><h2 className="text-sm font-black text-stone-800">Favorite genres</h2><p className="mt-2 break-words text-sm text-stone-700">{detailsError ? detailsError : privateDetails?.favorite_genres?.join(", ") || "No favorite genres added yet."}</p></section>
                <p className="text-xs text-stone-500">About Me and genres are reader-profile information and also appear in your reader-profile preview.</p>
              </div>
            </section>

            <section className="mt-5 rounded-2xl border border-white/80 bg-white/80 px-5 py-4 shadow-sm" aria-label="Reading activity summary">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-stone-600">
                {summary.readToday === true ? <span className="font-semibold text-emerald-800"><span aria-hidden="true">● </span>Read today</span> : null}
                <span>Currently reading <SummaryValue value={summary.currentlyReading} /></span>
                <span aria-hidden="true" className="text-stone-300">·</span>
                <span>Timed sessions this month <SummaryValue value={summary.sessionsWithTimeLoggedThisMonth} /></span>
                <span aria-hidden="true" className="text-stone-300">·</span>
                <span>Books finished <SummaryValue value={summary.booksFinished} /></span>
              </div>
              {summaryError ? <p className="mt-2 text-xs text-stone-500">{summaryError} <Link className="font-semibold text-stone-700 underline" href="/community/stats">See Reading Stats</Link>.</p> : null}
              <Link href="/community/stats" className="mt-3 inline-flex text-sm font-bold text-stone-700 underline decoration-stone-300 underline-offset-4 hover:text-stone-950">
                View detailed Reading Stats <span aria-hidden="true" className="ml-1">→</span>
              </Link>
            </section>
            {ownerId && profile && loadedOwner === ownerId ? <ProfileReadingStatistics key={`${ownerId}:${reloadVersion}`} ownerId={ownerId} profile={profile} isCurrentOwner={isCurrentOwner} /> : null}
            <Link href="/community/profile/preview" className="mt-4 inline-block text-sm font-bold text-stone-700 underline">Preview reader profile →</Link>
          </>
        )}
        <section aria-label="Browser appearance preferences" className="mt-8 space-y-3 border-t-2 border-stone-300 pt-6">
          <p className="text-sm font-semibold text-stone-700">Appearance changes apply immediately in this browser and are not undone by Cancel.</p>
          <AppearanceSettings />
        </section>
      </div>
    </main>
  );
}

export default function ProfileHubPage() {
  return <Suspense fallback={<main className="p-6">Loading your profile…</main>}><UnifiedProfile /></Suspense>;
}
