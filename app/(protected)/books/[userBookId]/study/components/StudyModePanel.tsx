"use client";

import { useState } from "react";

type ModeOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type StudyModePanelProps = {
  studySet: string;
  modeOptions: ModeOption[];
  onStudySetChange: (value: string) => void;
};

function descriptionForMode(value: string, fallback: string) {
  if (value === "READING") {
    return "Show the word and meaning, then type the reading.";
  }

  if (value === "MEANING") {
    return "Show the word and reading, then type the meaning.";
  }

  if (value === "FROM_READING_MEANING") {
    return "Show the reading, then type the meaning.";
  }

  if (value === "READING_MC") {
    return "Show the word and meaning, then choose the reading.";
  }

  if (value === "MEANING_MC") {
    return "Show the word and reading, then choose the meaning.";
  }

  if (value === "FROM_READING_MC") {
    return "Show the reading and meaning, then choose the word.";
  }

  if (value === "FROM_READING_MEANING_MC") {
    return "Show the reading, then choose the meaning.";
  }

  if (value === "COMPLETE") {
    return "Reveal the word, reading, and meaning step by step.";
  }

  return fallback;
}

export default function StudyModePanel({
  studySet,
  modeOptions,
  onStudySetChange,
}: StudyModePanelProps) {
  const [open, setOpen] = useState(false);

  const selectedMode =
    modeOptions.find((option) => option.value === studySet) ??
    modeOptions.find((option) => !option.disabled);

  const activeOptions = modeOptions.filter((option) => !option.disabled);

  return (
    <section className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        Study Mode · Step 2
      </p>

      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-black text-slate-950">
          {selectedMode?.label ?? "Choose a study mode"}
        </h2>

        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="ml-2 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-2 text-sm font-black text-blue-700 shadow-sm transition hover:bg-blue-100 sm:ml-4"
        >
          {open ? "Close" : "Change"}
        </button>
      </div>

      {open ? (
        <div className="mt-4 border-t border-slate-200 pt-4">
          <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
            Choose mode
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {activeOptions.map((option) => {
              const selected = option.value === studySet;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onStudySetChange(option.value);
                    setOpen(false);
                  }}
                  className={`rounded-2xl border px-4 py-3 text-left shadow-sm transition ${
                    selected
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-400 hover:bg-white"
                  }`}
                >
                  <p className="text-sm font-black">{option.label}</p>

                  <p
                    className={`mt-1 text-sm leading-5 ${
                      selected ? "text-slate-200" : "text-slate-500"
                    }`}
                  >
                    {descriptionForMode(option.value, option.label)}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}