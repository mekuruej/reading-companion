"use client";

import { useState } from "react";
import {
  JAPANESE_FLASHCARD_COMPLETE_MODES,
  JAPANESE_FLASHCARD_MULTIPLE_CHOICE_MODES,
  JAPANESE_FLASHCARD_TYPING_MODES,
} from "@/lib/study/japaneseFlashcardModes";

type PracticeStudyMode =
  | "READING"
  | "READING_MC"
  | "MEANING"
  | "MEANING_MC"
  | "FROM_READING_MEANING"
  | "FROM_READING_MC"
  | "FROM_READING_MEANING_MC"
  | "COMPLETE"
  | "COMPLETE_TYPING";

type ModeOption = {
  value: PracticeStudyMode;
  label: string;
};

type ModeGroup = {
  label: string;
  options: ModeOption[];
};

type LibraryPracticeModeSelectorProps = {
  value: PracticeStudyMode;
  onChange: (value: PracticeStudyMode) => void;
};

function modeLabel(mode: PracticeStudyMode) {
  switch (mode) {
    case "READING":
      return "Kanji/Meaning → Kana";
    case "MEANING":
      return "Meaning Typing";
    case "FROM_READING_MEANING":
      return "Kana → Meaning";
    case "READING_MC":
      return "Reading MC";
    case "MEANING_MC":
      return "Kanji/Kana → Meaning";
    case "FROM_READING_MC":
      return "Meaning → Kanji";
    case "FROM_READING_MEANING_MC":
      return "Kana to Meaning MC";
    case "COMPLETE":
      return "Touch Reveal";
    case "COMPLETE_TYPING":
      return "Typing Reveal";
    default:
      return "Reading Typing";
  }
}

function descriptionForMode(mode: PracticeStudyMode) {
  switch (mode) {
    case "READING":
      return "Show the word and meaning, then type the reading.";
    case "MEANING":
      return "Show the word and reading, then type the meaning.";
    case "FROM_READING_MEANING":
      return "Show the kana, then type the meaning.";
    case "READING_MC":
      return "Show the word and meaning, then choose the reading.";
    case "MEANING_MC":
      return "Show the word and reading, then choose the meaning.";
    case "FROM_READING_MC":
      return "Show the meaning, then choose the written word.";
    case "FROM_READING_MEANING_MC":
      return "Show the reading, then choose the meaning.";
    case "COMPLETE":
      return "Reveal the word, reading, and meaning step by step.";
    case "COMPLETE_TYPING":
      return "Type the reading, then type the meaning.";
    default:
      return "";
  }
}

const MODE_GROUPS: ModeGroup[] = [
  {
    label: "Typing",
    options: JAPANESE_FLASHCARD_TYPING_MODES.map((value) => ({
      value,
      label: modeLabel(value),
    })),
  },
  {
    label: "Multiple Choice",
    options: JAPANESE_FLASHCARD_MULTIPLE_CHOICE_MODES.map((value) => ({
      value,
      label: modeLabel(value),
    })),
  },
  {
    label: "Complete",
    options: JAPANESE_FLASHCARD_COMPLETE_MODES.map((value) => ({
      value,
      label: modeLabel(value),
    })),
  },
];

export default function LibraryPracticeModeSelector({
  value,
  onChange,
}: LibraryPracticeModeSelectorProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <p className="text-sm font-black uppercase tracking-wide text-blue-700">
        Study Mode · Step 2
      </p>

      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-black text-slate-950">
          {modeLabel(value)}
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
          <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">
            Choose mode
          </p>

          <div className="space-y-4">
            {MODE_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="mb-2 text-xs font-black uppercase tracking-wide text-blue-700">
                  {group.label}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {group.options.map((option) => {
                    const selected = option.value === value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          onChange(option.value);
                          setOpen(false);
                        }}
                        className={`rounded-2xl border px-4 py-3 text-left shadow-sm transition ${
                          selected
                            ? "border-slate-950 bg-slate-950 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50"
                        }`}
                      >
                        <div className="text-sm font-black">{option.label}</div>
                        <div
                          className={`mt-1 text-xs leading-5 ${
                            selected ? "text-slate-200" : "text-slate-500"
                          }`}
                        >
                          {descriptionForMode(option.value)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
