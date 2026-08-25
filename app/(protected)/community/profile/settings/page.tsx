// Profile Settings
//

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProfileShell from "@/components/profile/ProfileShell";
import { PROFILE_LEVEL_OPTIONS } from "@/lib/profileLevels";
import {
  legacyTargetLanguageForJapaneseLearning,
  wantsJapaneseLearning,
} from "@/lib/access/japaneseLearningIntent";
import { supabase } from "@/lib/supabaseClient";
import MekuruReadingLevelGuide from "@/components/profile/MekuruReadingLevelGuide";
import ProfileSettingsLoadingState from "./components/ProfileSettingsLoadingState";
import ProfileSettingsMessage from "./components/ProfileSettingsMessage";
import ProfileSettingsSaveBar from "./components/ProfileSettingsSaveBar";
import ProfileSettingsSectionLabel from "./components/ProfileSettingsSectionLabel";
import FavoriteGenreEditor from "./components/FavoriteGenreEditor";
import ProfileSettingsCoreCard from "./components/ProfileSettingsCoreCard";
import ProfileSettingsPublicCard from "./components/ProfileSettingsPublicCard";

type ProfileRole = "teacher" | "member" | "super_teacher" | "admin";

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
  const [japaneseLearningEnabled, setJapaneseLearningEnabled] = useState(false);
  const [level, setLevel] = useState("");

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
          .select("display_name, username, native_language, target_language, japanese_learning_enabled, level")
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

      setJapaneseLearningEnabled(wantsJapaneseLearning(profile));
      setLevel(profile?.level ?? "");

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

    if (japaneseLearningEnabled && !level.trim()) {
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

    const visibleJapaneseStudyFields = japaneseLearningEnabled
      ? {
          level: level.trim(),
        }
      : {};
    const visiblePublicJapaneseLevelFields = japaneseLearningEnabled
      ? {
          jlpt_level_public: publicLevel === "None" ? null : publicLevel,
        }
      : {};

    const [profileResult, publicResult] = await Promise.all([
      supabase.from("profiles").upsert(
        {
          id: user.id,
          display_name: displayName.trim(),
          username: cleanUsername,
          native_language: selectedNativeLanguage,
          japanese_learning_enabled: japaneseLearningEnabled,
          target_language: legacyTargetLanguageForJapaneseLearning(japaneseLearningEnabled),
          ...visibleJapaneseStudyFields,
        },
        { onConflict: "id" }
      ),
      supabase.from("user_public_profile").upsert(
        {
          user_id: user.id,
          ...visiblePublicJapaneseLevelFields,
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
    window.dispatchEvent(new Event("mekuru-profile-preferences-updated"));
    router.replace("/community/profile");
    router.refresh();
  }

  if (loading) {
    return (
      <ProfileSettingsLoadingState
        title="Edit Profile"
        description="Update your account basics and reader profile details."
        message="Loading profile details..."
      />
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
        <ProfileSettingsCoreCard
          displayName={displayName}
          username={username}
          nativeLanguageChoice={nativeLanguageChoice}
          customNativeLanguage={customNativeLanguage}
          japaneseLearningEnabled={japaneseLearningEnabled}
          nativeLanguageOptions={NATIVE_LANGUAGE_OPTIONS}
          nativeLanguageOther={NATIVE_LANGUAGE_OTHER}
          onDisplayNameChange={setDisplayName}
          onUsernameChange={setUsername}
          onNativeLanguageChoiceChange={setNativeLanguageChoice}
          onCustomNativeLanguageChange={setCustomNativeLanguage}
          onJapaneseLearningEnabledChange={setJapaneseLearningEnabled}
        />

        {japaneseLearningEnabled ? (
          <MekuruReadingLevelGuide selectedLevel={level} onSelect={setLevel} />
        ) : null}

        <ProfileSettingsPublicCard
          publicNameChoice={publicNameChoice}
          displayName={displayName}
          username={username}
          chosenPublicName={chosenPublicName}
          publicLevel={publicLevel}
          favoriteGenres={favoriteGenres}
          favoriteGenreInput={favoriteGenreInput}
          bio={bio}
          showJapaneseReadingLevel={japaneseLearningEnabled}
          profileLevelOptions={PROFILE_LEVEL_OPTIONS}
          onPublicNameChoiceChange={setPublicNameChoice}
          onPublicLevelChange={setPublicLevel}
          onFavoriteGenreInputChange={setFavoriteGenreInput}
          onAddFavoriteGenres={addFavoriteGenresFromInput}
          onRemoveFavoriteGenre={removeFavoriteGenre}
          onBioChange={setBio}
        />

        <ProfileSettingsMessage type="error" message={errorMsg} />
        <ProfileSettingsMessage type="success" message={successMsg} />

        <ProfileSettingsSaveBar
          saving={saving}
          onSave={handleSave}
        />
      </div>
    </ProfileShell>
  );
}
