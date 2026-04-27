// Setup Profile
// 

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

function SectionLabel({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-stone-600">{detail}</p>
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
  const [nativeLanguage, setNativeLanguage] = useState("");
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
      setNativeLanguage(profile?.native_language ?? "");
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

    if (!displayName.trim()) {
      setErrorMsg("Please enter a display name.");
      return;
    }

    if (!username.trim()) {
      setErrorMsg("Please enter a username.");
      return;
    }

    if (!nativeLanguage.trim()) {
      setErrorMsg("Please enter your native language.");
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
          native_language: nativeLanguage.trim(),
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
    router.replace("/profile");
    router.refresh();
  };

  if (loading) {
    return (
      <ProfileShell
        title="Profile Edits"
        description="Keep your required setup details and optional public profile information together in one place."
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
      title="Profile Edits"
      description="This is your main profile setup screen. A few fields are required to get started, and the public-sharing fields can be finished later."
    >
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          <div className="font-semibold">Required now</div>
          <div className="mt-1">
            Display name, username, native language, target language, and your Japanese reading
            level help Mekuru personalize the app right away.
          </div>
          <div className="mt-3 font-semibold">Optional for later</div>
          <div className="mt-1">
            Public name choice, public reading level, favorite genres, and bio can all be filled in
            whenever you are ready.
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <SectionLabel
            title="Core Profile"
            detail="These are the main details Mekuru uses for your account and reading setup."
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
                Lowercase letters, numbers, and underscores only.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-800">Native language</label>
              <input
                value={nativeLanguage}
                onChange={(e) => setNativeLanguage(e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2"
                placeholder="English"
              />
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
                Japanese is currently the supported language.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <SectionLabel
            title="Japanese Reading Level"
            detail="This level is used as the default starting point for reading-fit questions across the app."
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
            title="Public Sharing"
            detail="These are optional details other readers may see. You can leave them simple for now and come back later."
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
                Japanese Reading Level (public)
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

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl bg-stone-900 px-4 py-3 text-white disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save profile"}
        </button>
      </div>
    </ProfileShell>
  );
}
