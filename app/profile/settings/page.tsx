"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type LearningSettings = {
  user_id: string;
  learning_profile: "Beginner" | "Intermediate" | "Advanced" | "Custom";
  red_stages: number;
  orange_stages: number;
  yellow_stages: number;
  show_badge_numbers: boolean;
  color_system: string;
};

export default function LearningSettingsPage() {
  const [settings, setSettings] = useState<LearningSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSettings() {
    setMessage("");
    setLoading(true);

    try {
      const { data: auth, error: userError } = await supabase.auth.getUser();
      const user = auth?.user;

      if (userError || !user) {
        console.error("Error getting user:", userError);
        setMessage("Please sign in again.");
        setSettings(null);
        return;
      }

      // ✅ Use maybeSingle() so it returns one row or null (not an array)
      const { data, error } = await supabase
        .from("user_learning_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error loading settings:", error);
        setMessage(error.message ?? "Error loading settings.");
        setSettings(null);
        return;
      }

      // ✅ No row yet → create a default row
      if (!data) {
        const defaultSettings: LearningSettings = {
          user_id: user.id,
          learning_profile: "Advanced",
          red_stages: 1,
          orange_stages: 1,
          yellow_stages: 1,
          show_badge_numbers: true,
          color_system: "rainbow",
        };

        const { data: inserted, error: insertError } = await supabase
          .from("user_learning_settings")
          .insert(defaultSettings)
          .select("*")
          .single();

        if (insertError) {
          console.error("Error creating default settings:", insertError);
          setMessage(insertError.message ?? "Error creating default settings.");
          setSettings(null);
          return;
        }

        setSettings(inserted as LearningSettings);
        return;
      }

      // ✅ Existing row
      setSettings(data as LearningSettings);
    } catch (e: any) {
      console.error("loadSettings crashed:", e, JSON.stringify(e, null, 2));
      setMessage(e?.message ?? "Unexpected error loading settings.");
      setSettings(null);
    } finally {
      // ✅ Always stop loading (prevents “Loading settings…” forever)
      setLoading(false);
    }
  }

  function applyProfilePreset(profile: LearningSettings["learning_profile"]) {
    if (!settings) return;

    let updated: LearningSettings = { ...settings, learning_profile: profile };

    if (profile === "Beginner") {
      updated.red_stages = 3;
      updated.orange_stages = 3;
      updated.yellow_stages = 3;
    } else if (profile === "Intermediate") {
      updated.red_stages = 2;
      updated.orange_stages = 2;
      updated.yellow_stages = 2;
    } else if (profile === "Advanced") {
      updated.red_stages = 1;
      updated.orange_stages = 1;
      updated.yellow_stages = 1;
    }
    // Custom = keep whatever they already set

    setSettings(updated);
  }

  async function saveSettings() {
    if (!settings) return;

    setSaving(true);
    setMessage("");

    try {
      const { data: auth, error: userError } = await supabase.auth.getUser();
      const user = auth?.user;

      if (userError || !user) {
        setMessage("Please sign in again.");
        return;
      }

      // ✅ Upsert is safer than update: creates row if missing
      const { error } = await supabase.from("user_learning_settings").upsert(
        {
          user_id: user.id,
          learning_profile: settings.learning_profile,
          red_stages: settings.red_stages,
          orange_stages: settings.orange_stages,
          yellow_stages: settings.yellow_stages,
          show_badge_numbers: settings.show_badge_numbers,
          color_system: settings.color_system,
        },
        { onConflict: "user_id" }
      );

      if (error) {
        console.error("Error saving settings:", error);
        setMessage(error.message ?? "Error saving settings.");
      } else {
        setMessage("✅ Settings saved.");
      }
    } catch (e: any) {
      console.error("saveSettings crashed:", e, JSON.stringify(e, null, 2));
      setMessage(e?.message ?? "Error saving settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="max-w-xl mx-auto p-6">
        <p>Loading settings…</p>
      </main>
    );
  }

  if (!settings) {
    return (
      <main className="max-w-xl mx-auto p-6">
        <p className="mb-3 text-sm text-gray-700">{message || "No settings found for this user."}</p>
      </main>
    );
  }

  return (
    <main className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">THIS PAGE IS CURRENTLY NOT ACTIVE: Learning Settings</h1>

      {message && <p className="mb-3 text-sm text-gray-700">{message}</p>}

      {/* Learning Profile */}
      <section className="mb-6 border rounded-lg p-4 bg-white">
        <h2 className="font-semibold mb-2 text-lg">Learning Profile</h2>
        <p className="text-xs text-gray-500 mb-3">
          Beginner = 3 stages per color, Intermediate = 2, Advanced = 1. Custom lets you choose your
          own numbers.
        </p>

        <select
          className="border p-2 rounded w-full mb-3"
          value={settings.learning_profile}
          onChange={(e) => applyProfilePreset(e.target.value as LearningSettings["learning_profile"])}
        >
          <option value="Beginner">Beginner</option>
          <option value="Intermediate">Intermediate</option>
          <option value="Advanced">Advanced</option>
          <option value="Custom">Custom</option>
        </select>
      </section>

      {/* Stages Per Color */}
      <section className="mb-6 border rounded-lg p-4 bg-white">
        <h2 className="font-semibold mb-2 text-lg">Stages per Color</h2>
        <p className="text-xs text-gray-500 mb-3">
          How many mini-steps each warm color has before moving on. Green / Blue / Purple / Grey are
          infinite.
        </p>

        <div className="grid grid-cols-3 gap-4">
          {(["red", "orange", "yellow"] as const).map((c) => (
            <div key={c}>
              <label className="block mb-1 capitalize">{c} stages</label>
              <input
                type="number"
                min={1}
                max={5}
                className="border p-2 w-full rounded"
                value={settings[`${c}_stages` as keyof LearningSettings] as number}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    [`${c}_stages`]: Number(e.target.value),
                    learning_profile: "Custom",
                  } as LearningSettings)
                }
              />
            </div>
          ))}
        </div>
      </section>

      {/* Display Options */}
      <section className="mb-6 border rounded-lg p-4 bg-white">
        <h2 className="font-semibold mb-2 text-lg">Display Options</h2>

        <label className="flex items-center gap-2 mb-3 text-sm">
          <input
            type="checkbox"
            checked={settings.show_badge_numbers}
            onChange={(e) => setSettings({ ...settings, show_badge_numbers: e.target.checked })}
          />
          Show stage numbers inside the color badge
        </label>

        <label className="block mb-2 text-sm">Color System</label>
        <select
          className="border p-2 rounded w-full text-sm"
          value={settings.color_system}
          onChange={(e) => setSettings({ ...settings, color_system: e.target.value })}
        >
          <option value="rainbow">Rainbow (default)</option>
          <option value="mono">Monotone (future)</option>
          <option value="pastel">Pastel (future)</option>
        </select>
      </section>

      <button
        onClick={saveSettings}
        disabled={saving}
        className="bg-amber-500 text-white px-4 py-2 rounded hover:bg-amber-600 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save Settings"}
      </button>
    </main>
  );
}
