// Retired Reading Profile
// 

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  show_ability_check_reminder: boolean;
};

type MainStage = "red" | "orange" | "yellow" | "green" | "blue" | "grey" | "purple";

function colorLabel(stage: MainStage) {
  if (stage === "grey") return "Limbo";
  return stage.charAt(0).toUpperCase() + stage.slice(1);
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

function GroupLabel({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-stone-200" />
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          {title}
        </div>
        <div className="h-px flex-1 bg-stone-200" />
      </div>
      <p className="mt-2 text-center text-xs leading-5 text-stone-500">{detail}</p>
    </div>
  );
}

function isMissingSettingsColumnError(error: unknown) {
  const code = (error as { code?: string } | null)?.code;
  const message = String((error as { message?: string } | null)?.message ?? "");

  return (
    code === "42703" ||
    code === "PGRST204" ||
    message.includes("show_ability_check_reminder") ||
    message.includes("schema cache")
  );
}

export default function ReadingProfilePage() {
  const router = useRouter();
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
          show_ability_check_reminder: true,
        };
        setSettings(defaultSettings);
        return;
      }

      const loadedSettings = {
        ...(data as LearningSettings),
        skip_katakana_library_check:
          (data as Partial<LearningSettings>).skip_katakana_library_check ?? true,
        show_ability_check_reminder:
          (data as Partial<LearningSettings>).show_ability_check_reminder ?? true,
      };

      setSettings(loadedSettings);
    } finally {
      setLoading(false);
    }
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
          show_ability_check_reminder: settings.show_ability_check_reminder,
        },
        { onConflict: "user_id" }
      );

      if (error) {
        if (isMissingSettingsColumnError(error)) {
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
              : "Reading profile saved. Run the latest user-learning-settings SQL to save the Ability Check reminder setting."
          );
        } else {
          setMessage(error.message ?? "Error saving reading profile.");
        }
      } else {
        setMessage("Reading profile saved.");
        router.replace("/community/profile");
        router.refresh();
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
      description="Choose how Mekuru turns real reading encounters into color support and Ability Check gates."
    >
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-sky-950">Color logic</h2>
          <p className="mt-2 text-sm leading-6 text-sky-950/80">
            Mekuru uses a color logic system to help you notice recurring words until they become
            part of study that tests your ability. Every encounter, even in the beginning, is
            important and worth noticing.
          </p>
          <p className="mt-3 text-xs leading-5 text-sky-900/70">
            Your reading style preset controls the encounter support behind the scenes. After the
            final yellow step, encounters keep counting, but color movement comes from Ability
            Check.
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900">Color path</h2>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            Changing your profile does not erase your reading history. It changes how strictly
            Mekuru interprets your encounters before sending words to Ability Check.
          </p>

          <div className="mt-5 space-y-5">
            <div>
              <GroupLabel
                title="Based on encounters"
                detail="Red, orange, and yellow come from real reading encounters, not quiz answers."
              />
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <ColorStepCard
                  stage="red"
                  title="Early encounter support"
                  detail="You have started meeting this word in real reading, but it is still too new for Ability Check."
                  note="This is controlled by your reading style preset."
                />
                <ColorStepCard
                  stage="orange"
                  title="Repeated encounter support"
                  detail="The word is showing up again, but Mekuru is still gathering reading support before testing it."
                  note="Encounters keep building quietly in the background."
                />
                <ColorStepCard
                  stage="yellow"
                  title="Ready for gate checks"
                  detail="The final yellow stage means the word has enough encounter support for Ability Check."
                  note="Yellow is the readiness checkpoint before the Reading Gate."
                />
              </div>
            </div>

            <div>
              <GroupLabel
                title="Based on ability"
                detail="Green, blue, purple, and Limbo come from Ability Check results."
              />
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <ColorStepCard
                  stage="green"
                  title="Reading gate passed"
                  detail="In Ability Check, you typed or chose the reading correctly."
                  note="This means reading knowledge has cleared its first gate."
                />
                <ColorStepCard
                  stage="blue"
                  title="Meaning gate passed"
                  detail="In Ability Check, you answered the saved meaning or definition target."
                  note="Advanced words may care about the saved definition number."
                />
                <ColorStepCard
                  stage="purple"
                  title="Mastered"
                  detail="The word has cleared the major study gates and is no longer demanding regular attention."
                  note="Purple cards return only occasionally."
                />
                <ColorStepCard
                  stage="grey"
                  title="Limbo: between gates"
                  detail="The word is being held before the next gate, either because it is not ready yet or because a gate was missed."
                  note="Limbo is support, not punishment."
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900">Ability Check session</h2>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            Ability Check stays strict and only opens when enough cards are due. Practice can still
            show a larger review set whenever you want.
          </p>

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
                Skip katakana-only words in Ability Check
              </span>
              <span className="mt-1 block text-xs leading-5 text-stone-500">
                They keep a small カ badge, but they will not enter the strict gate session when this
                is on.
              </span>
            </span>
          </label>

          <label className="mt-4 flex items-start gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={settings.show_ability_check_reminder}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  show_ability_check_reminder: e.target.checked,
                })
              }
              className="mt-1"
            />
            <span>
              <span className="font-semibold text-stone-900">
                Show Ability Check reminder on my Library page
              </span>
              <span className="mt-1 block text-xs leading-5 text-stone-500">
                When words are ready today, Mekuru can show a quiet Library reminder. You can
                still hide it for the day from the Library page.
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
