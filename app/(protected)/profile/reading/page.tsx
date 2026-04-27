// Reading Profile
// 

"use client";

import { useEffect, useState } from "react";
import ProfileShell from "@/components/profile/ProfileShell";
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

type MainStage = "red" | "orange" | "yellow" | "green" | "blue" | "grey";

function stagePill(stage: MainStage) {
  const base = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold";

  if (stage === "red") return `${base} bg-red-600 text-white`;
  if (stage === "orange") return `${base} bg-orange-500 text-white`;
  if (stage === "yellow") return `${base} bg-yellow-300 text-stone-900`;
  if (stage === "green") return `${base} bg-green-600 text-white`;
  if (stage === "blue") return `${base} bg-blue-600 text-white`;
  return `${base} bg-slate-500 text-white`;
}

function ReadingStyleCard({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${
        active
          ? "border-stone-900 bg-stone-100"
          : "border-stone-200 bg-white hover:bg-stone-50"
      }`}
    >
      <div className="text-sm font-semibold text-stone-900">{title}</div>
      <div className="mt-2 text-sm leading-6 text-stone-600">{description}</div>
    </button>
  );
}

function ColorStepCard({
  stage,
  title,
  detail,
  note,
}: {
  stage: MainStage;
  title: string;
  detail: string;
  note: string;
}) {
  return (
    <div className="rounded-xl border border-stone-200 p-4">
      <div className="flex items-center gap-2">
        <span className={stagePill(stage)}>
          {stage.charAt(0).toUpperCase() + stage.slice(1)}
        </span>
      </div>
      <div className="mt-2 text-sm font-semibold text-stone-900">{title}</div>
      <div className="mt-1 text-sm leading-6 text-stone-600">{detail}</div>
      <div className="mt-2 text-xs text-stone-500">{note}</div>
    </div>
  );
}

export default function ReadingProfilePage() {
  const [settings, setSettings] = useState<LearningSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void loadSettings();
  }, []);

  async function loadSettings() {
    setMessage("");
    setLoading(true);

    try {
      const { data: auth, error: userError } = await supabase.auth.getUser();
      const user = auth?.user;

      if (userError || !user) {
        setMessage("Please sign in again.");
        setSettings(null);
        return;
      }

      const { data, error } = await supabase
        .from("user_learning_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        setMessage(error.message ?? "Error loading reading profile.");
        setSettings(null);
        return;
      }

      if (!data) {
        setSettings({
          user_id: user.id,
          learning_profile: "Advanced",
          red_stages: 1,
          orange_stages: 1,
          yellow_stages: 1,
          show_badge_numbers: true,
          color_system: "rainbow",
        });
        return;
      }

      setSettings(data as LearningSettings);
    } finally {
      setLoading(false);
    }
  }

  function applyProfilePreset(profile: LearningSettings["learning_profile"]) {
    if (!settings) return;

    const updated: LearningSettings = { ...settings, learning_profile: profile };

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
        setMessage(error.message ?? "Error saving reading profile.");
      } else {
        setMessage("Reading profile saved.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <ProfileShell
        title="Reading Profile"
        description="This page is about how you like to read and study, not factual account details."
      >
        <div className="mx-auto max-w-4xl rounded-2xl border border-stone-200 bg-white p-6 text-stone-600">
          Loading reading profile...
        </div>
      </ProfileShell>
    );
  }

  if (!settings) {
    return (
      <ProfileShell
        title="Reading Profile"
        description="This page is about how you like to read and study, not factual account details."
      >
        <div className="mx-auto max-w-4xl rounded-2xl border border-stone-200 bg-white p-6 text-stone-600">
          {message || "No reading profile found."}
        </div>
      </ProfileShell>
    );
  }

  return (
    <ProfileShell
      title="Reading Profile"
      description="Set the study and display preferences that shape how Mekuru supports your reading."
    >
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900">Reading style preset</h2>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            Choose the kind of support you usually want while reading. You can always switch to a
            custom setup later.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <ReadingStyleCard
              active={settings.learning_profile === "Beginner"}
              title="More support"
              description="More warm-color stages before words cool down. Better when you want gentler repetition."
              onClick={() => applyProfilePreset("Beginner")}
            />
            <ReadingStyleCard
              active={settings.learning_profile === "Intermediate"}
              title="Balanced"
              description="A middle-ground setting for readers who want support without everything staying urgent for too long."
              onClick={() => applyProfilePreset("Intermediate")}
            />
            <ReadingStyleCard
              active={settings.learning_profile === "Advanced"}
              title="Lighter support"
              description="Faster cooling and less hand-holding. Good if you want the system to stay quieter."
              onClick={() => applyProfilePreset("Advanced")}
            />
          </div>

          <button
            type="button"
            onClick={() => setSettings({ ...settings, learning_profile: "Custom" })}
            className={`mt-3 rounded-xl border px-4 py-2 text-sm transition ${
              settings.learning_profile === "Custom"
                ? "border-stone-900 bg-stone-900 text-white"
                : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
            }`}
          >
            Use custom settings
          </button>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900">Warm-color stages</h2>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            These control how long words stay visually urgent before settling down.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {(["red", "orange", "yellow"] as const).map((color) => (
              <div key={color}>
                <label className="block text-sm font-medium capitalize text-stone-800">
                  {color} stages
                </label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                  value={settings[`${color}_stages` as keyof LearningSettings] as number}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      [`${color}_stages`]: Number(e.target.value),
                      learning_profile: "Custom",
                    } as LearningSettings)
                  }
                />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900">What the colors mean</h2>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            Your colors come from lookup behavior and check stages, not from self-report. Red,
            orange, and yellow use your chosen repetition settings above.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ColorStepCard
              stage="red"
              title="New / just met it"
              detail="A word lands here when it is still fresh and unfamiliar."
              note={`Currently set to ${settings.red_stages} stage${
                settings.red_stages === 1 ? "" : "s"
              } before moving on.`}
            />
            <ColorStepCard
              stage="orange"
              title="Seen again"
              detail="You have met it more than once, but recognition is still warming up."
              note={`Currently set to ${settings.orange_stages} stage${
                settings.orange_stages === 1 ? "" : "s"
              } before moving on.`}
            />
            <ColorStepCard
              stage="yellow"
              title="Almost readable"
              detail="This is the last lookup-driven color before Mekuru starts checking knowledge more directly."
              note={`Currently set to ${settings.yellow_stages} stage${
                settings.yellow_stages === 1 ? "" : "s"
              } before moving on.`}
            />
            <ColorStepCard
              stage="green"
              title="Read-check"
              detail="The word should be readable now. This is where the app starts treating reading as the next hurdle."
              note="A gate stage before meaning confidence."
            />
            <ColorStepCard
              stage="blue"
              title="Meaning-check"
              detail="You can get through the reading, but meaning still needs to feel stable."
              note="A gate stage before the word settles fully."
            />
            <ColorStepCard
              stage="grey"
              title="Stable"
              detail="This is the calm end of the ladder: the word is no longer demanding attention."
              note="Grey means the word feels settled for now."
            />
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900">Display preferences</h2>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            Small choices that change how much visual guidance you want on the page.
          </p>

          <label className="mt-4 flex items-center gap-3 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={settings.show_badge_numbers}
              onChange={(e) =>
                setSettings({ ...settings, show_badge_numbers: e.target.checked })
              }
            />
            Show stage numbers inside vocabulary color badges
          </label>

          <div className="mt-4">
            <label className="block text-sm font-medium text-stone-800">Color system</label>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={settings.color_system}
              onChange={(e) => setSettings({ ...settings, color_system: e.target.value })}
            >
              <option value="rainbow">Rainbow</option>
              <option value="mono">Monotone</option>
              <option value="pastel">Pastel</option>
            </select>
          </div>
        </div>

        {message ? <p className="text-sm text-stone-700">{message}</p> : null}

        <button
          type="button"
          onClick={saveSettings}
          disabled={saving}
          className="w-full rounded-xl bg-stone-900 px-4 py-3 text-white disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save reading profile"}
        </button>
      </div>
    </ProfileShell>
  );
}
