"use client";

import { useState } from "react";

type PracticeStudyMode = "reveal" | "typing";

type LibraryPracticeModeSelectorProps = {
  value: PracticeStudyMode;
  onChange: (value: PracticeStudyMode) => void;
};

function modeLabel(mode: PracticeStudyMode) {
  return mode === "reveal" ? "Reveal" : "Typing";
}

export default function LibraryPracticeModeSelector({
  value,
  onChange,
}: LibraryPracticeModeSelectorProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
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
          {value === "reveal" ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-600">
              <p>Tap once to check the reading.</p>
              <p>Tap again to check the meaning.</p>
              <p>Tap a third time to move to the next card.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-600">
              <p>Type the reading, then type the meaning.</p>
              <p>Kana is best; Hepburn romaji also works.</p>
            </div>
          )}

          <div className="mt-4 flex justify-center">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-center">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                Review style
              </p>

              <div className="mt-2 inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => onChange("reveal")}
                  className={`rounded-xl px-5 py-2 text-sm font-black transition ${
                    value === "reveal"
                      ? "bg-slate-950 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Reveal
                </button>

                <button
                  type="button"
                  onClick={() => onChange("typing")}
                  className={`rounded-xl px-5 py-2 text-sm font-black transition ${
                    value === "typing"
                      ? "bg-slate-950 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Typing
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}