// Profile Settings
//

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProfileShell from "@/components/profile/ProfileShell";
import MekuruReadingLevelGuide from "@/components/profile/MekuruReadingLevelGuide";
import { supabase } from "@/lib/supabaseClient";

type ProfileRole = "teacher" | "member" | "student" | "super_teacher";

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
  const [message, setMessage] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [nativeLanguageChoice, setNativeLanguageChoice] = useState("");
  const [customNativeLanguage, setCustomNativeLanguage] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("Japanese");
  const [level, setLevel] = useState("");
  const [existingRole, setExistingRole] = useState<ProfileRole | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("display_name, username, native_language, target_language, level, role")
        .eq("id", user.id)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        setMessage(error.message ?? "Could not load profile settings.");
        setLoading(false);
        return;
      }

      setDisplayName(profile?.display_name ?? "");
      setUsername(profile?.username ?? "");
      setTargetLanguage(profile?.target_language ?? "Japanese");
      setLevel(profile?.level ?? "");
      setExistingRole((profile?.role as ProfileRole | null) ?? null);

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

      setLoading(false);
    }

    void loadProfile();

    return () => {
      mounted = false;
    };
  }, [router]);

  async function saveSettings() {
    setMessage("");

    const cleanUsername = username.trim().toLowerCase();
    const selectedNativeLanguage =
      nativeLanguageChoice === NATIVE_LANGUAGE_OTHER
        ? customNativeLanguage.trim()
        : nativeLanguageChoice.trim();

    if (!displayName.trim()) {
      setMessage("Please enter a display name.");
      return;
    }

    if (!cleanUsername) {
      setMessage("Please enter a username.");
      return;
    }

    if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
      setMessage("Username can only use lowercase letters, numbers, and underscores.");
      return;
    }

    if (!selectedNativeLanguage) {
      setMessage("Please choose your native language.");
      return;
    }

    if (!targetLanguage.trim()) {
      setMessage("Please choose a target language.");
      return;
    }

    if (!level.trim()) {
      setMessage("Please choose the reading level that feels closest right now.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const { error } = await supabase.from("profiles").upsert(
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
      );

      if (error) {
        setMessage(error.message ?? "Could not save profile settings.");
        return;
      }

      router.replace("/community/profile");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <ProfileShell
        title="Profile Settings"
        description="Set the basic details Mekuru needs before you start using your Library."
      >
        <div className="mx-auto max-w-3xl rounded-2xl border border-stone-200 bg-white p-6 text-stone-600 shadow-sm">
          Loading profile settings...
        </div>
      </ProfileShell>
    );
  }

  return (
    <ProfileShell
      title="Profile Settings"
      description="A quick first setup for your account basics. You can add public profile details later from Edit Profile."
    >
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          These are the essentials Mekuru needs: your name, Library link, language background, and
          current Japanese reading level.
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="grid gap-5 md:grid-cols-2">
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
                Lowercase letters, numbers, and underscores only. This becomes your Library link.
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

        {message ? <p className="text-sm text-red-600">{message}</p> : null}

        <button
          type="button"
          onClick={saveSettings}
          disabled={saving}
          className="w-full rounded-xl bg-stone-900 px-4 py-3 text-white disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save profile settings"}
        </button>
      </div>
    </ProfileShell>
  );
}