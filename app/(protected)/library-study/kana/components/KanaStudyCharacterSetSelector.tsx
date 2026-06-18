"use client";

import { useState } from "react";

type KanaSetOptions = {
  includeBasic: boolean;
  includeDakuten: boolean;
  includeYoon: boolean;
};

type KanaStudyCharacterSetSelectorProps = {
  kanaSetSummary: string;
  includeBasic: boolean;
  includeDakuten: boolean;
  includeYoon: boolean;
  onChange: (options: KanaSetOptions) => void;
};

export function KanaStudyCharacterSetSelector({
  kanaSetSummary,
  includeBasic,
  includeDakuten,
  includeYoon,
  onChange,
}: KanaStudyCharacterSetSelectorProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
        Filters · Step 1
      </p>

      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-black text-slate-950">
          Choose which kana to study
        </h2>

        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="ml-2 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-2 text-sm font-black text-blue-700 shadow-sm transition hover:bg-blue-100 sm:ml-4"
        >
          {open ? "Close" : "Change"}
        </button>
      </div>

      <p className="mt-1 text-sm font-semibold text-slate-500">
        {kanaSetSummary}
      </p>

      {open ? (
        <div className="mt-4 border-t border-slate-200 pt-4">
          <p className="text-sm text-slate-500">
            Pick one kana set for a focused review, or combine sets for a bigger challenge.
          </p>

          <div className="mt-4">
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
              Kana sets
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() =>
                  onChange({
                    includeBasic: !includeBasic,
                    includeDakuten,
                    includeYoon,
                  })
                }
                className={`rounded-2xl border px-4 py-4 text-left shadow-sm transition ${
                  includeBasic
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded border text-xs ${
                      includeBasic
                        ? "border-white bg-white text-slate-950"
                        : "border-slate-400 bg-white text-transparent"
                    }`}
                  >
                    ✓
                  </span>

                  <span className="text-sm font-black">Basic Kana</span>
                </div>

                <p
                  className={`mt-3 text-lg font-semibold leading-8 tracking-wide ${
                    includeBasic ? "text-white" : "text-slate-700"
                  }`}
                >
                  あ、か、さ...
                </p>

                <p
                  className={`mt-1 text-xs font-semibold ${
                    includeBasic ? "text-slate-300" : "text-slate-500"
                  }`}
                >
                  五十音（ごじゅうおん）
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  onChange({
                    includeBasic,
                    includeDakuten: !includeDakuten,
                    includeYoon,
                  })
                }
                className={`rounded-2xl border px-4 py-4 text-left shadow-sm transition ${
                  includeDakuten
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded border text-xs ${
                      includeDakuten
                        ? "border-white bg-white text-slate-950"
                        : "border-slate-400 bg-white text-transparent"
                    }`}
                  >
                    ✓
                  </span>

                  <span className="text-sm font-black">Dakuten + Handakuten</span>
                </div>

                <p
                  className={`mt-3 text-lg font-semibold leading-8 tracking-wide ${
                    includeDakuten ? "text-white" : "text-slate-700"
                  }`}
                >
                  が、ざ、ぱ...
                </p>

                <p
                  className={`mt-1 text-xs font-semibold ${
                    includeDakuten ? "text-slate-300" : "text-slate-500"
                  }`}
                >
                  濁音・半濁音
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  onChange({
                    includeBasic,
                    includeDakuten,
                    includeYoon: !includeYoon,
                  })
                }
                className={`rounded-2xl border px-4 py-4 text-left shadow-sm transition ${
                  includeYoon
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded border text-xs ${
                      includeYoon
                        ? "border-white bg-white text-slate-950"
                        : "border-slate-400 bg-white text-transparent"
                    }`}
                  >
                    ✓
                  </span>

                  <span className="text-sm font-black">Combo Sounds</span>
                </div>

                <p
                  className={`mt-3 text-lg font-semibold leading-8 tracking-wide ${
                    includeYoon ? "text-white" : "text-slate-700"
                  }`}
                >
                  きゃ、しゅ、りょ...
                </p>

                <p
                  className={`mt-1 text-xs font-semibold ${
                    includeYoon ? "text-slate-300" : "text-slate-500"
                  }`}
                >
                  拗音（ようおん）
                </p>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}