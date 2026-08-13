// Mini Profile Setup
//

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProfileShell from "@/components/profile/ProfileShell";
import MekuruReadingLevelGuide from "@/components/profile/MekuruReadingLevelGuide";
import {
  legacyTargetLanguageForJapaneseLearning,
  wantsJapaneseLearning,
} from "@/lib/access/japaneseLearningIntent";
import { supabase } from "@/lib/supabaseClient";

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

export default function ProfileSetupPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [nativeLanguageChoice, setNativeLanguageChoice] = useState("");
  const [customNativeLanguage, setCustomNativeLanguage] = useState("");
  const [japaneseLearningEnabled, setJapaneseLearningEnabled] = useState<boolean | null>(null);
  const [level, setLevel] = useState("");
  const [shouldInitializeMemberRole, setShouldInitializeMemberRole] = useState(false);
  const [shouldInitializeFreeAccess, setShouldInitializeFreeAccess] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      setLoading(true);
      setMessage("");

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
        .select(
          "display_name, username, native_language, target_language, japanese_learning_enabled, level, role, app_access_type"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        setMessage(error.message ?? "Could not load profile setup.");
        setLoading(false);
        return;
      }

      setDisplayName(profile?.display_name ?? "");
      setUsername(profile?.username ?? "");
      setJapaneseLearningEnabled(profile ? wantsJapaneseLearning(profile) : null);
      setLevel(profile?.level ?? "");
      setShouldInitializeMemberRole(!profile || !profile.role);
      setShouldInitializeFreeAccess(!profile || !profile.app_access_type);

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

  async function saveSetup() {
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

    if (japaneseLearningEnabled === null) {
      setMessage("Please choose whether you want Japanese Study Tools.");
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

      const initialAccessFields = shouldInitializeFreeAccess
        ? {
            app_access_type: "free",
            app_access_expires_at: null,
            trial_started_at: null,
          }
        : {};
      const initialRoleFields = shouldInitializeMemberRole
        ? {
            role: "member",
          }
        : {};

      const { error } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          ...initialRoleFields,
          display_name: displayName.trim(),
          username: cleanUsername,
          native_language: selectedNativeLanguage,
          japanese_learning_enabled: japaneseLearningEnabled,
          target_language: legacyTargetLanguageForJapaneseLearning(japaneseLearningEnabled),
          level: level.trim(),
          ...initialAccessFields,
        },
        { onConflict: "id" }
      );

      if (error) {
        setMessage(error.message ?? "Could not save profile setup.");
        return;
      }

      router.replace("/books");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <ProfileShell
        title="Quick Profile Setup"
        description="Create the basic profile Mekuru needs before you start using your Library."
      >
        <div className="mx-auto max-w-3xl rounded-2xl border border-stone-200 bg-white p-6 text-stone-600 shadow-sm">
          Loading profile setup...
        </div>
      </ProfileShell>
    );
  }

  return (
    <ProfileShell
      title="Quick Profile Setup"
      description="Just the basics Mekuru needs to create your profile and Library link."
    >
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          Just the basics for now. You can add your full reader profile, favorite genres, bio, and
          public profile details later from the Community tab.
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
              <label className="block text-sm font-medium text-stone-800">
                Japanese Study Tools
              </label>
              <div className="mt-1 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setJapaneseLearningEnabled(true)}
                  className={`rounded-xl border px-3 py-3 text-left transition ${
                    japaneseLearningEnabled === true
                      ? "border-stone-900 bg-stone-900 text-white"
                      : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                  }`}
                >
                  <span className="block text-sm font-black">Yes</span>
                  <span className="mt-1 block text-xs opacity-80">
                    Show the Study area and free Japanese study tools.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setJapaneseLearningEnabled(false)}
                  className={`rounded-xl border px-3 py-3 text-left transition ${
                    japaneseLearningEnabled === false
                      ? "border-stone-900 bg-stone-900 text-white"
                      : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                  }`}
                >
                  <span className="block text-sm font-black">No</span>
                  <span className="mt-1 block text-xs opacity-80">
                    Keep MEKURU focused on your reading companion.
                  </span>
                </button>
              </div>
              <p className="mt-1 text-xs text-stone-500">
                Paid Japanese Learning features are separate.
              </p>
            </div>
          </div>
        </div>

        <MekuruReadingLevelGuide selectedLevel={level} onSelect={setLevel} />

        {message ? <p className="text-sm text-red-600">{message}</p> : null}

        <button
          type="button"
          onClick={saveSetup}
          disabled={saving}
          className="w-full rounded-xl bg-stone-900 px-4 py-3 text-white disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save quick setup"}
        </button>
      </div>
    </ProfileShell>
  );
}
