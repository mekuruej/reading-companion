// Edit Profile
// 

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MekuruReadingLevelGuide from "@/components/profile/MekuruReadingLevelGuide";
import ProfileShell from "@/components/profile/ProfileShell";
import { PROFILE_LEVEL_OPTIONS } from "@/lib/profileLevels";
import { supabase } from "@/lib/supabaseClient";

type ProfileRole = "teacher" | "member" | "student";

type PublicProfileRow = {
  user_id: string;
  jlpt_level_public: string | null;
  favorite_genres: string[] | null;
  bio: string | null;
  public_name_choice: "display_name" | "username" | null;
};

const NATIVE_LANGUAGE_OPTIONS = [
  "English",
  "Japanese",
  "Korean",
  "Chinese",
  "Spanish",
  "French",
  "German",
  "Portuguese",
  "Italian",
  "Vietnamese",
  "Thai",
  "Indonesian",
  "Russian",
  "Arabic",
  "Hindi",
] as const;

const NATIVE_LANGUAGE_OTHER = "Other";

function SectionLabel({
  title,
  detail,
  eyebrow,
}: {
  title: string;
  detail: string;
  eyebrow?: string;
}) {
  return (
    <div>
      {eyebrow ? (
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
          {eyebrow}
        </div>
      ) : null}
      <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-stone-600">{detail}</p>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-100 bg-white px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-semibold text-stone-900">{value || "—"}</div>
    </div>
  );
}

export default function ProfileSetupPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [nativeLanguageChoice, setNativeLanguageChoice] = useState("");
  const [customNativeLanguage, setCustomNativeLanguage] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("Japanese");
  const [level, setLevel] = useState("");
  const [existingRole, setExistingRole] = useState<ProfileRole | null>(null);

  const [publicNameChoice, setPublicNameChoice] = useState<
    "display_name" | "username"
  >("display_name");
  const [publicLevel, setPublicLevel] = useState("None");
  const [favoriteGenres, setFavoriteGenres] = useState<string[]>([]);
  const [favoriteGenreInput, setFavoriteGenreInput] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const [{ data: profile, error: profileError }, { data: publicProfile, error: publicError }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("display_name, username, native_language, target_language, role, level")
            .eq("id", user.id)
            .maybeSingle(),
          supabase
            .from("user_public_profile")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);

      if (!mounted) return;

      if (profileError) {
        setErrorMsg(profileError.message);
        setLoading(false);
        return;
      }

      if (publicError) {
        console.error("Error loading public profile:", publicError);
      }

      setDisplayName(profile?.display_name ?? "");
      setUsername(profile?.username ?? "");
      const loadedNativeLanguage = profile?.native_language?.trim() ?? "";
      if (
        loadedNativeLanguage &&
        NATIVE_LANGUAGE_OPTIONS.includes(
          loadedNativeLanguage as (typeof NATIVE_LANGUAGE_OPTIONS)[number]
        )
      ) {
        setNativeLanguageChoice(loadedNativeLanguage);
        setCustomNativeLanguage("");
      } else if (loadedNativeLanguage) {
        setNativeLanguageChoice(NATIVE_LANGUAGE_OTHER);
        setCustomNativeLanguage(loadedNativeLanguage);
      } else {
        setNativeLanguageChoice("");
        setCustomNativeLanguage("");
      }
      setTargetLanguage(profile?.target_language ?? "Japanese");
      setLevel(profile?.level ?? "");
      setExistingRole((profile?.role as ProfileRole | null) ?? null);

      const publicRow = (publicProfile as PublicProfileRow | null) ?? null;
      setPublicNameChoice(publicRow?.public_name_choice ?? "display_name");
      setPublicLevel(publicRow?.jlpt_level_public ?? "None");
      setFavoriteGenres((publicRow?.favorite_genres ?? []).filter(Boolean));
      setFavoriteGenreInput("");
      setBio(publicRow?.bio ?? "");
      setLoading(false);
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [router]);

  function addFavoriteGenresFromInput() {
    const nextGenres = favoriteGenreInput
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (nextGenres.length === 0) return;

    setFavoriteGenres((current) => {
      const merged = [...current];

      nextGenres.forEach((genre) => {
        if (!merged.some((existing) => existing.toLowerCase() === genre.toLowerCase())) {
          merged.push(genre);
        }
      });

      return merged;
    });
    setFavoriteGenreInput("");
  }

  function removeFavoriteGenre(genreToRemove: string) {
    setFavoriteGenres((current) =>
      current.filter((genre) => genre !== genreToRemove)
    );
  }

  const handleSave = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    const selectedNativeLanguage =
      nativeLanguageChoice === NATIVE_LANGUAGE_OTHER
        ? customNativeLanguage.trim()
        : nativeLanguageChoice.trim();

    if (!displayName.trim()) {
      setErrorMsg("Please enter a display name.");
      return;
    }

    if (!username.trim()) {
      setErrorMsg("Please enter a username.");
      return;
    }

    if (!selectedNativeLanguage) {
      setErrorMsg("Please choose your native language.");
      return;
    }

    if (!targetLanguage.trim()) {
      setErrorMsg("Please choose a target language.");
      return;
    }

    if (!level.trim()) {
      setErrorMsg("Please choose the reading level that feels closest right now.");
      return;
    }

    const cleanUsername = username.trim().toLowerCase();

    if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
      setErrorMsg("Username can only use lowercase letters, numbers, and underscores.");
      return;
    }

    setSaving(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSaving(false);
      router.replace("/login");
      return;
    }

    const draftGenres = favoriteGenreInput
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const cleanedGenres = [...favoriteGenres];

    draftGenres.forEach((genre) => {
      if (!cleanedGenres.some((existing) => existing.toLowerCase() === genre.toLowerCase())) {
        cleanedGenres.push(genre);
      }
    });

    const [profileResult, publicResult] = await Promise.all([
      supabase.from("profiles").upsert(
        {
          id: user.id,
          display_name: displayName.trim(),
          username: cleanUsername,
          native_language: selectedNativeLanguage,
          target_language: targetLanguage.trim(),
          level: level.trim(),
          role: existingRole ?? "member",
        },
        { onConflict: "id" }
      ),
      supabase.from("user_public_profile").upsert(
        {
          user_id: user.id,
          jlpt_level_public: publicLevel === "None" ? null : publicLevel,
          favorite_genres: cleanedGenres,
          bio: bio.trim(),
          public_name_choice: publicNameChoice,
        },
        { onConflict: "user_id" }
      ),
    ]);

    setSaving(false);

    if (profileResult.error) {
      setErrorMsg(profileResult.error.message);
      return;
    }

    if (publicResult.error) {
      setErrorMsg(publicResult.error.message);
      return;
    }

    setSuccessMsg("Profile saved.");
    router.replace("/community/profile");
    router.refresh();
  };

  if (loading) {
    return (
      <ProfileShell
        title="Edit Profile"
        description="Update your account basics and the reader details you may choose to show publicly."
      >
        <div className="mx-auto w-full max-w-4xl rounded-xl border bg-white p-6 text-center shadow-sm">
          <p className="text-stone-600">Loading profile details...</p>
        </div>
      </ProfileShell>
    );
  }

  const chosenPublicName =
    publicNameChoice === "username"
      ? username.trim() || "No username set yet"
      : displayName.trim() || "No display name set yet";

  return (
    <ProfileShell
      title="Edit Profile"
      description="Update the basics Mekuru uses for your account and the public details other readers may see."
    >
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
            Profile Preview
          </div>
          <h2 className="mt-2 text-lg font-semibold text-sky-950">
            {chosenPublicName}
          </h2>
          <p className="mt-1 text-sm leading-6 text-sky-950/75">
            This page has two jobs: account basics help Mekuru work correctly, and public details
            shape how you appear around the community.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <PreviewRow label="Username" value={username.trim() ? `@${username.trim()}` : ""} />
            <PreviewRow label="Reading level" value={level || "Not set"} />
            <PreviewRow label="Public level" value={publicLevel === "None" ? "Hidden" : publicLevel} />
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <SectionLabel
            eyebrow="Account basics"
            title="Core profile"
            detail="These details keep your account, Library link, and reading setup working smoothly."
          />

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-stone-800">Display name</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                placeholder="Devon"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-800">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                placeholder="devon"
              />
              <p className="mt-1 text-xs text-stone-500">
                Lowercase letters, numbers, and underscores only. Your Library link uses this name.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-800">Native language</label>
              <select
                value={nativeLanguageChoice}
                onChange={(e) => setNativeLanguageChoice(e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
              >
                <option value="">Choose a language</option>
                {NATIVE_LANGUAGE_OPTIONS.map((language) => (
                  <option key={language} value={language}>
                    {language}
                  </option>
                ))}
                <option value={NATIVE_LANGUAGE_OTHER}>Other</option>
              </select>
              {nativeLanguageChoice === NATIVE_LANGUAGE_OTHER ? (
                <input
                  value={customNativeLanguage}
                  onChange={(e) => setCustomNativeLanguage(e.target.value)}
                  className="mt-2 w-full rounded-xl border px-3 py-2"
                  placeholder="Type your language"
                />
              ) : null}
              <p className="mt-1 text-xs text-stone-500">
                One primary language for now. You can use Other for bilingual or less common
                answers.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-800">Target language</label>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
              >
                <option value="Japanese">Japanese</option>
              </select>
              <p className="mt-1 text-xs text-stone-500">
                Japanese is currently the only supported language.
              </p>
            </div>
          </div>
        </div>

        <MekuruReadingLevelGuide />

        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <SectionLabel
            eyebrow="Reading fit"
            title="Japanese reading level"
            detail="This is the default starting point for reading-fit questions. Your Reading Profile controls color support separately."
          />

          <div className="mt-4 space-y-2">
            {PROFILE_LEVEL_OPTIONS.map((option) => {
              const isSelected = level === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setLevel(option.value)}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                    isSelected
                      ? "border-stone-900 bg-stone-100"
                      : "border-stone-200 bg-white hover:bg-stone-50"
                  }`}
                >
                  <div className="text-sm font-semibold text-stone-900">
                    {option.title} · {option.plain} ({option.cefr} · {option.jlpt})
                  </div>
                  <div className="mt-1 text-xs leading-5 text-stone-600">{option.feel}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <SectionLabel
            eyebrow="Community"
            title="Public reader profile"
            detail="These details are optional. Keep them simple now, or use them to make your reader profile feel more like you."
          />

          <div className="mt-5 space-y-5">
            <div>
              <label className="block text-sm font-medium text-stone-800">
                Name shown to other readers
              </label>
              <select
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={publicNameChoice}
                onChange={(e) =>
                  setPublicNameChoice(e.target.value as "display_name" | "username")
                }
              >
                <option value="display_name">
                  Display Name ({displayName.trim() || "not set yet"})
                </option>
                <option value="username">Username ({username.trim() || "not set yet"})</option>
              </select>
              <p className="mt-2 text-sm text-stone-600">
                Other readers will see:{" "}
                <span className="font-medium text-stone-900">{chosenPublicName}</span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-800">
                Japanese reading level shown publicly
              </label>
              <select
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={publicLevel}
                onChange={(e) => setPublicLevel(e.target.value)}
              >
                <option value="None">Prefer not to share</option>
                {PROFILE_LEVEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.title} · {option.plain} ({option.cefr} · {option.jlpt})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-800">Favorite genres</label>
              <p className="mt-1 text-xs text-stone-500">
                Add one or more genres, then press Enter or click Add.
              </p>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  className="w-full rounded-xl border px-3 py-2"
                  placeholder="fantasy, slice-of-life"
                  value={favoriteGenreInput}
                  onChange={(e) => setFavoriteGenreInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addFavoriteGenresFromInput();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addFavoriteGenresFromInput}
                  className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
                >
                  Add
                </button>
              </div>

              {favoriteGenres.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {favoriteGenres.map((genre) => (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => removeFavoriteGenre(genre)}
                      className="rounded-full border border-stone-300 bg-stone-100 px-3 py-1 text-sm text-stone-700 transition hover:bg-stone-200"
                    >
                      {genre} ×
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-stone-500">No genres added yet.</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-800">Bio</label>
              <textarea
                className="mt-1 w-full rounded-xl border px-3 py-2"
                rows={5}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A little about your reading life, interests, or goals."
              />
            </div>
          </div>
        </div>

        {errorMsg ? <p className="text-sm text-red-600">{errorMsg}</p> : null}
        {successMsg ? <p className="text-sm text-emerald-700">{successMsg}</p> : null}

        <div className="sticky bottom-4 z-10 rounded-2xl border border-stone-200 bg-white/95 p-3 shadow-lg backdrop-blur">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-xl bg-stone-900 px-4 py-3 text-white disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save profile"}
          </button>
        </div>
      </div>
    </ProfileShell>
  );
}
