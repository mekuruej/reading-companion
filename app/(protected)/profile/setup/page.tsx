"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type ProfileRole = "teacher" | "member" | "student";

export default function ProfileSetupPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [nativeLanguage, setNativeLanguage] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("Japanese");
  const [existingRole, setExistingRole] = useState<ProfileRole | null>(null);

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

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("display_name, username, native_language, target_language, role")
        .eq("id", user.id)
        .maybeSingle();

      if (!mounted) return;

      if (profileError) {
        setErrorMsg(profileError.message);
        setLoading(false);
        return;
      }

      setDisplayName(profile?.display_name ?? "");
      setUsername(profile?.username ?? "");
      setNativeLanguage(profile?.native_language ?? "");
      setTargetLanguage(profile?.target_language ?? "Japanese");
      setExistingRole((profile?.role as ProfileRole | null) ?? null);
      setLoading(false);
    };

    load();

    return () => {
      mounted = false;
    };
  }, [router]);

  const handleSave = async () => {
    setErrorMsg("");

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

    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        display_name: displayName.trim(),
        username: cleanUsername,
        native_language: nativeLanguage.trim(),
        target_language: targetLanguage.trim(),
        role: existingRole ?? "member",
      },
      { onConflict: "id" }
    );

    setSaving(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    router.replace("/books");
    router.refresh();
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-xl border bg-white p-6 shadow-sm text-center">
          <p className="text-stone-600">Loading profile setup...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-10">
      <div className="mx-auto max-w-lg rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-stone-900">Set up your profile</h1>
        <p className="mt-2 text-sm text-stone-600">
          Just a few details to get started.
        </p>

        <div className="mt-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-stone-800">
              Display name
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder="Devon"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-800">
              Username
            </label>
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
            <label className="block text-sm font-medium text-stone-800">
              Native language
            </label>
            <input
              value={nativeLanguage}
              onChange={(e) => setNativeLanguage(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder="English"
            />
            <p className="mt-1 text-xs text-stone-500">
              The site is currently in English, but your native language may help
              with learner comparisons in the future.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-800">
              Target language
            </label>
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

        {errorMsg ? (
          <p className="mt-4 text-sm text-red-600">{errorMsg}</p>
        ) : null}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="mt-6 w-full rounded-xl bg-stone-900 px-4 py-2 text-white disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save and continue"}
        </button>
      </div>
    </main>
  );
}