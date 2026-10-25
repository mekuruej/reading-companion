"use client";

import { useEffect, useRef, useState } from "react";
import MekuruReadingLevelGuide from "@/components/profile/MekuruReadingLevelGuide";
import {
  legacyTargetLanguageForJapaneseLearning,
  wantsJapaneseLearning,
} from "@/lib/access/japaneseLearningIntent";
import { profileReadingLevelFields } from "@/lib/profileLevels";
import { supabase } from "@/lib/supabaseClient";
import ProfileSettingsPublicCard from "./settings/components/ProfileSettingsPublicCard";
import { PROFILE_LEVEL_OPTIONS } from "@/lib/profileLevels";
import { saveProfileRecords } from "@/lib/profile/saveProfileRecords";
import ProfileSettingsCoreCard from "./settings/components/ProfileSettingsCoreCard";
import ProfileSettingsMessage from "./settings/components/ProfileSettingsMessage";
import ProfileSettingsSaveBar from "./settings/components/ProfileSettingsSaveBar";


const NATIVE_LANGUAGE_OPTIONS = [
  "English", "Japanese", "Korean", "Chinese", "Spanish", "French", "German",
  "Portuguese", "Italian", "Vietnamese", "Thai", "Indonesian", "Russian", "Arabic", "Hindi",
] as const;
const NATIVE_LANGUAGE_OTHER = "Other";

type ProfileEditorProps = {
  ownerId: string;
  isCurrentOwner: (id: string) => boolean;
  onCancel: () => void;
  onSaved: () => void;
};

export default function ProfileEditor({ ownerId, isCurrentOwner, onCancel, onSaved }: ProfileEditorProps) {
  const activeRef = useRef(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [publicNameChoice, setPublicNameChoice] = useState<"display_name" | "username">("display_name");
  const [publicLevel, setPublicLevel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [originalUsername, setOriginalUsername] = useState("");
  const [nativeLanguageChoice, setNativeLanguageChoice] = useState("");
  const [customNativeLanguage, setCustomNativeLanguage] = useState("");
  const [japaneseLearningEnabled, setJapaneseLearningEnabled] = useState(false);
  const [level, setLevel] = useState("");
  const [favoriteGenres, setFavoriteGenres] = useState<string[]>([]);
  const [favoriteGenreInput, setFavoriteGenreInput] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    let active = true;
    activeRef.current = true;

    async function loadProfile() {
      setLoading(true);
      setErrorMsg("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!active || !isCurrentOwner(ownerId)) return;
      if (userError || !user || user.id !== ownerId || !isCurrentOwner(ownerId)) {
        if (active && isCurrentOwner(ownerId)) {
          setErrorMsg("Please sign in before editing your profile.");
          setLoadFailed(true);
          setLoading(false);
        }
        return;
      }

      const [profileResult, aboutResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name, username, native_language, target_language, japanese_learning_enabled, level")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("user_public_profile")
          .select("favorite_genres, bio, public_name_choice, jlpt_level_public")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (!active || !isCurrentOwner(ownerId)) return;
      if (profileResult.error) {
        setErrorMsg(profileResult.error.message);
        setLoadFailed(true);
        setLoading(false);
        return;
      }
      if (aboutResult.error) {
        setErrorMsg(aboutResult.error.message);
        setLoadFailed(true);
        setLoading(false);
        return;
      }

      const profile = profileResult.data;
      setDisplayName(profile?.display_name ?? "");
      setUsername(profile?.username ?? "");
      setOriginalUsername(profile?.username ?? "");

      const savedNativeLanguage = profile?.native_language ?? "";
      if (savedNativeLanguage && !NATIVE_LANGUAGE_OPTIONS.includes(savedNativeLanguage as (typeof NATIVE_LANGUAGE_OPTIONS)[number])) {
        setNativeLanguageChoice(NATIVE_LANGUAGE_OTHER);
        setCustomNativeLanguage(savedNativeLanguage);
      } else {
        setNativeLanguageChoice(savedNativeLanguage);
        setCustomNativeLanguage("");
      }

      setJapaneseLearningEnabled(wantsJapaneseLearning(profile));
      setLevel(profile?.level ?? "");
      setFavoriteGenres(aboutResult.data?.favorite_genres ?? []);
      setBio(aboutResult.data?.bio ?? "");
      setPublicNameChoice(aboutResult.data?.public_name_choice ?? "display_name");
      setPublicLevel(aboutResult.data?.jlpt_level_public ?? null);
      setLoading(false);
    }

    void loadProfile().catch(() => {
      if (active && isCurrentOwner(ownerId)) { setErrorMsg("Could not load your saved profile details."); setLoadFailed(true); setLoading(false); }
    });
    return () => { active = false; activeRef.current = false; };
  }, [ownerId, isCurrentOwner]);

  useEffect(() => { if (!loading) titleRef.current?.focus(); }, [loading]);

  function addFavoriteGenresFromInput() {
    const nextGenres = favoriteGenreInput.split(",").map((genre) => genre.trim()).filter(Boolean);
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

  async function handleSave() {
    if (saving || !isCurrentOwner(ownerId) || !activeRef.current) return;
    setErrorMsg("");
    const cleanDisplayName = displayName.trim();
    if (!cleanDisplayName) {
      setErrorMsg("Please add a display name.");
      return;
    }

    const cleanUsername = username === originalUsername ? originalUsername : username.trim().toLowerCase();
    if (!cleanUsername) {
      setErrorMsg("Please choose a username.");
      return;
    }
    if (username !== originalUsername && !/^[a-z0-9_]+$/.test(cleanUsername)) {
      setErrorMsg("Usernames can only use lowercase letters, numbers, and underscores.");
      return;
    }

    const selectedNativeLanguage = nativeLanguageChoice === NATIVE_LANGUAGE_OTHER
      ? customNativeLanguage.trim()
      : nativeLanguageChoice.trim();
    if (!selectedNativeLanguage) {
      setErrorMsg("Please choose your native language.");
      return;
    }

    const cleanedGenres: string[] = [];
    favoriteGenres.forEach((genre) => {
      const cleanGenre = genre.trim();
      if (cleanGenre && !cleanedGenres.some((existing) => existing.toLowerCase() === cleanGenre.toLowerCase())) {
        cleanedGenres.push(cleanGenre);
      }
    });

    setSaving(true);
    try {
      await saveProfileRecords(supabase, ownerId, {
        display_name: cleanDisplayName,
        username: cleanUsername,
        native_language: selectedNativeLanguage,
        japanese_learning_enabled: japaneseLearningEnabled,
        target_language: legacyTargetLanguageForJapaneseLearning(japaneseLearningEnabled),
        ...profileReadingLevelFields(japaneseLearningEnabled, level),
      }, {
        public_name_choice: publicNameChoice,
        ...(japaneseLearningEnabled ? { jlpt_level_public: publicLevel } : {}),
        favorite_genres: cleanedGenres,
        bio: bio.trim(),
      }, id => activeRef.current && isCurrentOwner(id), () => {
        setOriginalUsername(cleanUsername);
        setUsername(cleanUsername);
        window.dispatchEvent(new Event("mekuru-profile-preferences-updated"));
      });
      if (!activeRef.current || !isCurrentOwner(ownerId)) return;
      onSaved();
    } catch (error) {
      if (activeRef.current && isCurrentOwner(ownerId)) setErrorMsg(error instanceof Error ? error.message : "Could not save your profile. Please try again.");
    } finally {
      if (activeRef.current && isCurrentOwner(ownerId)) setSaving(false);
    }
  }

  if (loading) {
    return <div className="rounded-3xl border border-stone-200 bg-white p-8 text-center text-sm font-semibold text-stone-600">Loading your profile details…</div>;
  }

  if (loadFailed) {
    return (
      <div role="alert" className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm">
        <p className="text-sm leading-6 text-red-800">We couldn’t load your saved profile details, so editing is paused to protect them. {errorMsg}</p>
        <button type="button" onClick={onCancel} className="mt-4 rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">Back to Profile</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-500">My Profile</p>
        <h1 ref={titleRef} tabIndex={-1} className="mt-2 text-3xl font-black text-stone-950">Edit Profile</h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">Update your name, account link, language preferences, and personal profile details.</p>
      </div>



      <fieldset disabled={saving} className="space-y-4 border-0 p-0">
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

      {japaneseLearningEnabled ? <MekuruReadingLevelGuide optional selectedLevel={level} onSelect={setLevel} /> : null}

      <ProfileSettingsPublicCard
        publicNameChoice={publicNameChoice}
        displayName={displayName}
        username={username}
        chosenPublicName={publicNameChoice === "username" ? username.trim() || "No username set yet" : displayName.trim() || "No display name set yet"}
        publicLevel={publicLevel}
        showJapaneseReadingLevel={japaneseLearningEnabled}
        profileLevelOptions={PROFILE_LEVEL_OPTIONS}
        onPublicNameChoiceChange={setPublicNameChoice}
        onPublicLevelChange={(value) => setPublicLevel(value === "None" ? null : value)}
        favoriteGenres={favoriteGenres}
        favoriteGenreInput={favoriteGenreInput}
        bio={bio}
        onFavoriteGenreInputChange={setFavoriteGenreInput}
        onAddFavoriteGenres={addFavoriteGenresFromInput}
        onRemoveFavoriteGenre={(genre) => setFavoriteGenres((current) => current.filter((item) => item !== genre))}
        onBioChange={setBio}
      />

      </fieldset>
      <ProfileSettingsMessage type="error" message={errorMsg} />
      <ProfileSettingsSaveBar saving={saving} onSave={() => void handleSave()} onCancel={onCancel} />
    </div>
  );
}
