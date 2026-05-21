// Profile Settings
//

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProfileShell from "@/components/profile/ProfileShell";
import { PROFILE_LEVEL_OPTIONS } from "@/lib/profileLevels";
import { supabase } from "@/lib/supabaseClient";
import MekuruReadingLevelGuide from "@/components/profile/MekuruReadingLevelGuide";

type ProfileRole = "teacher" | "member" | "student" | "super_teacher";

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
      <div className="mt-1 truncate text-sm font-semibold text-stone-900">
        {value || "—"}
      </div>
    </div>
  );
}

export default function ProfileSettingsPage() {
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

  const [publicNameChoice, setPublicNameChoice] = useState<"display_name" | "username">(
    "display_name"
  );
  const [publicLevel, setPublicLevel] = useState("None");
  const [favoriteGenres, setFavoriteGenres] = useState<string[]>([]);
  const [favoriteGenreInput, setFavoriteGenreInput] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      setLoading(true);
      setErrorMsg("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (active) {
          setErrorMsg("Please log in before editing your profile.");
          setLoading(false);
        }
        return;
      }

      const [profileResult, publicResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name, username, native_language, target_language, role, level")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("user_public_profile")
          .select("user_id, jlpt_level_public, favorite_genres, bio, public_name_choice")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (!active) return;

      if (profileResult.error) {
        setErrorMsg(profileResult.error.message);
        setLoading(false);
        return;
      }

      if (publicResult.error) {
        setErrorMsg(publicResult.error.message);
        setLoading(false);
        return;
      }

      const profile = profileResult.data;
      const publicRow = publicResult.data as PublicProfileRow | null;

      setDisplayName(profile?.display_name ?? "");
      setUsername(profile?.username ?? "");

      const savedNativeLanguage = profile?.native_language ?? "";
      if (
        savedNativeLanguage &&
        !NATIVE_LANGUAGE_OPTIONS.includes(
          savedNativeLanguage as (typeof NATIVE_LANGUAGE_OPTIONS)[number]
        )
      ) {
        setNativeLanguageChoice(NATIVE_LANGUAGE_OTHER);
        setCustomNativeLanguage(savedNativeLanguage);
      } else {
        setNativeLanguageChoice(savedNativeLanguage);
        setCustomNativeLanguage("");
      }

      setTargetLanguage(profile?.target_language ?? "Japanese");
      setLevel(profile?.level ?? "");
      setExistingRole((profile?.role as ProfileRole | null) ?? null);

      setPublicNameChoice(publicRow?.public_name_choice ?? "display_name");
      setPublicLevel(publicRow?.jlpt_level_public ?? "None");
      setFavoriteGenres(publicRow?.favorite_genres ?? []);
      setBio(publicRow?.bio ?? "");

      setLoading(false);
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  function addFavoriteGenresFromInput() {
    const nextGenres = favoriteGenreInput
      .split(",")
      .map((genre) => genre.trim())
      .filter(Boolean);

    if (nextGenres.length === 0) return;

    setFavoriteGenres((current) => {
      const normalized = new Set(current.map((genre) => genre.toLowerCase()));
      const merged = [...current];

      nextGenres.forEach((genre) => {
        if (!normalized.has(genre.toLowerCase())) {
          merged.push(genre);
          normalized.add(genre.toLowerCase());
        }
      });

      return merged;
    });

    setFavoriteGenreInput("");
  }

  function removeFavoriteGenre(genreToRemove: string) {
    setFavoriteGenres((current) => current.filter((genre) => genre !== genreToRemove));
  }

  async function handleSave() {
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSaving(false);
      setErrorMsg("Please log in before saving your profile.");
      return;
    }

    const cleanUsername = username.trim().toLowerCase();

    if (!displayName.trim()) {
      setSaving(false);
      setErrorMsg("Please add a display name.");
      return;
    }

    if (!cleanUsername) {
      setSaving(false);
      setErrorMsg("Please choose a username.");
      return;
    }

    if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
      setSaving(false);
      setErrorMsg("Usernames can only use lowercase letters, numbers, and underscores.");
      return;
    }

    const selectedNativeLanguage =
      nativeLanguageChoice === NATIVE_LANGUAGE_OTHER
        ? customNativeLanguage.trim()
        : nativeLanguageChoice.trim();

    if (!selectedNativeLanguage) {
      setSaving(false);
      setErrorMsg("Please choose your native language.");
      return;
    }

    if (!targetLanguage.trim()) {
      setSaving(false);
      setErrorMsg("Please choose your target language.");
      return;
    }

    if (!level.trim()) {
      setSaving(false);
      setErrorMsg("Please choose the reading level that feels closest right now.");
      return;
    }

    const cleanedGenres: string[] = [];
    favoriteGenres.forEach((genre) => {
      const cleanGenre = genre.trim();
      if (
        cleanGenre &&
        !cleanedGenres.some(
          (existing) => existing.toLowerCase() === cleanGenre.toLowerCase()
        )
      ) {
        cleanedGenres.push(cleanGenre);
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
  }

  if (loading) {
    return (
      <ProfileShell
        title="Edit Profile"
        description="Update your account basics and reader profile details."
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
      description="Update your Mekuru profile, reading level, and public reader details."
    >
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
            Profile Preview
          </div>
          <h2 className="mt-2 text-lg font-semibold text-sky-950">{chosenPublicName}</h2>
          <p className="mt-1 text-sm leading-6 text-sky-950/75">
            Account basics help Mekuru work correctly. Public details shape how you appear around
            the community.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <PreviewRow label="Username" value={username.trim() ? `@${username.trim()}` : ""} />
            <PreviewRow label="Reading level" value={level || "Not set"} />
            <PreviewRow
              label="Public level"
              value={publicLevel === "None" ? "Hidden" : publicLevel}
            />
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

        <MekuruReadingLevelGuide selectedLevel={level} onSelect={setLevel} />

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

              {favoriteGenres.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {favoriteGenres.map((genre) => (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => removeFavoriteGenre(genre)}
                      className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-700 hover:bg-stone-100"
                    >
                      {genre} ×
                    </button>
                  ))}
                </div>
              ) : null}
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