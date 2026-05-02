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
  skip_katakana_library_check: boolean;
  library_check_daily_limit: number;
};

type MainStage = "red" | "orange" | "yellow" | "green" | "blue" | "grey" | "purple";

function colorLabel(stage: MainStage) {
  if (stage === "grey") return "Limbo";
  return stage.charAt(0).toUpperCase() + stage.slice(1);
}

function cleanDailyCheckLimit(value: number | null | undefined) {
  if (value === 10 || value === 20 || value === 30) return value;
  return 20;
}

function stagePill(stage: MainStage) {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold";

  if (stage === "red") return `${base} bg-red-600 text-white`;
  if (stage === "orange") return `${base} bg-orange-500 text-white`;
  if (stage === "yellow") return `${base} bg-yellow-300 text-stone-900`;
  if (stage === "green") return `${base} bg-green-600 text-white`;
  if (stage === "blue") return `${base} bg-blue-600 text-white`;
  if (stage === "purple") return `${base} bg-purple-600 text-white`;
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
    <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className={stagePill(stage)}>
          {stage.charAt(0).toUpperCase() + stage.slice(1)}
        </span>
      </div>
      <div className="mt-2 text-sm font-semibold leading-5 text-stone-900">{title}</div>
      <div className="mt-1 text-xs leading-5 text-stone-600">{detail}</div>
      <div className="mt-2 text-[11px] leading-4 text-stone-500">{note}</div>
    </div>
  );
}

function totalEncounterSteps(settings: LearningSettings) {
  return settings.red_stages + settings.orange_stages + settings.yellow_stages;
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
        const defaultSettings: LearningSettings = {
          user_id: user.id,
          learning_profile: "Advanced",
          red_stages: 1,
          orange_stages: 1,
          yellow_stages: 1,
          show_badge_numbers: true,
          color_system: "rainbow",
          skip_katakana_library_check: true,
          library_check_daily_limit: 20,
        };
        setSettings(defaultSettings);
        return;
      }

      const loadedSettings = {
        ...(data as LearningSettings),
        skip_katakana_library_check:
          (data as Partial<LearningSettings>).skip_katakana_library_check ?? true,
        library_check_daily_limit: cleanDailyCheckLimit(
          (data as Partial<LearningSettings>).library_check_daily_limit
        ),
      };

      setSettings(loadedSettings);
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
          skip_katakana_library_check: settings.skip_katakana_library_check,
          library_check_daily_limit: cleanDailyCheckLimit(settings.library_check_daily_limit),
        },
        { onConflict: "user_id" }
      );

      if (error) {
        if ((error as any).code === "42703") {
          const { error: fallbackError } = await supabase.from("user_learning_settings").upsert(
            {
              user_id: user.id,
              learning_profile: settings.learning_profile,
              red_stages: settings.red_stages,
              orange_stages: settings.orange_stages,
              yellow_stages: settings.yellow_stages,
              show_badge_numbers: settings.show_badge_numbers,
              color_system: settings.color_system,
              skip_katakana_library_check: settings.skip_katakana_library_check,
            },
            { onConflict: "user_id" }
          );

          setMessage(
            fallbackError
              ? fallbackError.message ?? "Error saving reading profile."
              : "Reading profile saved. Run the daily-limit SQL to save the Library Check card limit."
          );
        } else {
          setMessage(error.message ?? "Error saving reading profile.");
        }
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
      description="Set how much real reading support a word needs before Mekuru asks you to study it directly."
    >
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900">What the Mekuru colors mean</h2>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            Changing your profile does not erase your reading history. It changes how strictly
            Mekuru interprets your encounters before sending words to Library Study.
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <ColorStepCard
              stage="red"
              title="Early encounter support"
              detail="You have started meeting this word in real reading, but it is still too new for Library Study."
              note={`Currently set to ${settings.red_stages} stage${
                settings.red_stages === 1 ? "" : "s"
              }.`}
            />
            <ColorStepCard
              stage="orange"
              title="Repeated encounter support"
              detail="The word is showing up again, but Mekuru is still gathering reading support before testing it."
              note={`Currently set to ${settings.orange_stages} stage${
                settings.orange_stages === 1 ? "" : "s"
              }.`}
            />
            <ColorStepCard
              stage="yellow"
              title="Final encounter support"
              detail="The final yellow stage means the word has enough encounter support for Library Study."
              note={`Currently set to ${settings.yellow_stages} stage${
                settings.yellow_stages === 1 ? "" : "s"
              }.`}
            />
            <div className="hidden lg:block" />
            <ColorStepCard
              stage="green"
              title="Reading gate passed"
              detail="In Library Study, you typed or chose the reading correctly."
              note="This means reading knowledge has cleared its first gate."
            />
            <ColorStepCard
              stage="blue"
              title="Meaning gate passed"
              detail="In Library Study, you answered the saved meaning or definition target."
              note="Advanced words may care about the saved definition number."
            />
            <ColorStepCard
              stage="purple"
              title="Mastered"
              detail="The word has cleared the major study gates and is no longer demanding regular attention."
              note="Purple can split into passive/active mastery later."
            />
            <ColorStepCard
              stage="grey"
              title="Between gates"
              detail="The word is being held before the next gate, either because it is not ready yet or because a gate was missed."
              note="Grey is not punishment, and strong words can skip it."
            />
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900">Reading style preset</h2>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            Choose how much encounter support you usually want before words become eligible for
            Library Study.
          </p>

          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold leading-6 text-amber-900">
            This controls how many real reading encounters a word needs before it can appear in
            Library Study. It does not count quiz answers.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <ReadingStyleCard
              active={settings.learning_profile === "Beginner"}
              title="More support"
              description="Recommended for beginners: 3 red, 3 orange, and 3 yellow stages before Library Study."
              onClick={() => applyProfilePreset("Beginner")}
            />
            <ReadingStyleCard
              active={settings.learning_profile === "Intermediate"}
              title="Balanced"
              description="Recommended for intermediate readers: 2 red, 2 orange, and 2 yellow stages before Library Study."
              onClick={() => applyProfilePreset("Intermediate")}
            />
            <ReadingStyleCard
              active={settings.learning_profile === "Advanced"}
              title="Lighter support"
              description="Recommended for advanced readers: 1 red, 1 orange, and 1 yellow stage before Library Study."
              onClick={() => applyProfilePreset("Advanced")}
            />
          </div>

          <div className="mt-6 border-t border-stone-200 pt-5">
            <h3 className="text-base font-semibold text-stone-900">Encounter support stages</h3>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              Red, orange, and yellow are based on real reading encounters, not quiz performance.
              The final yellow stage is the normal threshold for Library Study.
            </p>

            <p className="mt-3 text-sm leading-6 text-stone-700">
              Your current setup uses{" "}
              <span className="font-semibold">{totalEncounterSteps(settings)} encounter steps</span>{" "}
              before a word is ready for its first Library Study gate.
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

            <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-600">
              If too many hard words are showing up in Library Check, a gentle custom setup is to
              leave red and orange lower and add extra yellow stages. That keeps words visible as
              almost-ready without sending them to a gate too quickly.
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900">Library Check session</h2>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            Keep the strict gate session small enough to finish. Practice can still show the larger
            pool whenever you want.
          </p>

          <div className="mt-4">
            <label className="block text-sm font-medium text-stone-800">
              Cards per Library Check session
            </label>
            <select
              value={cleanDailyCheckLimit(settings.library_check_daily_limit)}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  library_check_daily_limit: Number(e.target.value),
                })
              }
              className="mt-1 w-full rounded-xl border px-3 py-2"
            >
              <option value={10}>10 cards</option>
              <option value={20}>20 cards</option>
              <option value={30}>30 cards</option>
            </select>
          </div>

          <label className="mt-4 flex items-start gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={settings.skip_katakana_library_check}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  skip_katakana_library_check: e.target.checked,
                })
              }
              className="mt-1"
            />
            <span>
              <span className="font-semibold text-stone-900">
                Skip katakana-only words in Library Check
              </span>
              <span className="mt-1 block text-xs leading-5 text-stone-500">
                They keep a small カ badge, but they will not enter the strict gate session when this
                is on.
              </span>
            </span>
          </label>
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
