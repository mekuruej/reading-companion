"use client";

import { useMemo, useState } from "react";

type Stage =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "grey"
  | "pink"
  | "black";

type Level = "beginner" | "intermediate" | "advanced";

function repsForLevel(level: string | null | undefined) {
  if (level === "beginner") return 3;
  if (level === "intermediate") return 2;
  return 1;
}

function pill(stage: Stage) {
  const base = "rounded-full px-2 py-1 text-xs font-semibold inline-flex items-center";
  if (stage === "red") return `${base} bg-red-600 text-white`;
  if (stage === "orange") return `${base} bg-orange-500 text-white`;
  if (stage === "yellow") return `${base} bg-yellow-300 text-slate-900`;
  if (stage === "green") return `${base} bg-green-600 text-white`;
  if (stage === "blue") return `${base} bg-blue-600 text-white`;
  if (stage === "purple") return `${base} bg-purple-600 text-white`;
  if (stage === "pink") return `${base} bg-pink-500 text-white`;
  if (stage === "black") return `${base} bg-black text-white`;
  return `${base} bg-slate-500 text-white`; // grey
}

export default function ColorLegend({
  level,
}: {
  level: string | null | undefined;
}) {
  const [open, setOpen] = useState(false);

  const reps = useMemo(() => repsForLevel(level), [level]);
  const lvl = (level ?? "beginner") as Level;

  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50"
      >
        {open ? "Hide color guide" : "What do the colors mean?"}
      </button>

      {open && (
        <div className="mt-3 rounded-2xl border p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Color ladder</div>
              <div className="mt-1 text-xs text-slate-600">
                Your level: <span className="font-semibold">{lvl}</span> →{" "}
                <span className="font-semibold">{reps}</span> lookups per step (for red/orange/yellow)
              </div>
            </div>
          </div>

          {/* Main ladder */}
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-xl border p-3">
              <div className="flex items-center gap-2">
                <span className={pill("red")}>Red</span>
                <span className="text-sm font-semibold">{reps}×</span>
              </div>
              <div className="mt-1 text-sm text-slate-700">New / just met it</div>
              <div className="text-xs text-slate-500">Counted by lookups while searching</div>
            </div>

            <div className="rounded-xl border p-3">
              <div className="flex items-center gap-2">
                <span className={pill("orange")}>Orange</span>
                <span className="text-sm font-semibold">{reps}×</span>
              </div>
              <div className="mt-1 text-sm text-slate-700">Seen again</div>
              <div className="text-xs text-slate-500">Still building recognition</div>
            </div>

            <div className="rounded-xl border p-3">
              <div className="flex items-center gap-2">
                <span className={pill("yellow")}>Yellow</span>
                <span className="text-sm font-semibold">{reps}×</span>
              </div>
              <div className="mt-1 text-sm text-slate-700">Almost readable</div>
              <div className="text-xs text-slate-500">Last lookup-driven step</div>
            </div>

            <div className="rounded-xl border p-3">
              <div className="flex items-center gap-2">
                <span className={pill("green")}>Green</span>
                <span className="text-xs rounded-full border px-2 py-1">Gate</span>
              </div>
              <div className="mt-1 text-sm text-slate-700">Read-Check</div>
              <div className="text-xs text-slate-500">
                Can’t move on until you can read it (later: type the reading)
              </div>
            </div>

            <div className="rounded-xl border p-3">
              <div className="flex items-center gap-2">
                <span className={pill("blue")}>Blue</span>
                <span className="text-xs rounded-full border px-2 py-1">Gate</span>
              </div>
              <div className="mt-1 text-sm text-slate-700">Meaning-Check</div>
              <div className="text-xs text-slate-500">
                Can’t move on until you know the meaning (later: meaning check / quiz)
              </div>
            </div>

            <div className="rounded-xl border p-3">
              <div className="flex items-center gap-2">
                <span className={pill("grey")}>Grey</span>
              </div>
              <div className="mt-1 text-sm text-slate-700">Mastered</div>
              <div className="text-xs text-slate-500">Stable / “done”</div>
            </div>
          </div>

          {/* Branch after Yellow */}
          <div className="mt-4 rounded-xl border p-3">
            <div className="text-sm font-semibold">After Yellow, special cards branch out:</div>

            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-xl border p-3">
                <div className="flex items-center gap-2">
                  <span className={pill("purple")}>Purple</span>
                  <span className="text-sm font-semibold">Katakana</span>
                </div>
                <div className="mt-1 text-xs text-slate-600">Kana Tome</div>
              </div>

              <div className="rounded-xl border p-3">
                <div className="flex items-center gap-2">
                  <span className={pill("black")}>Black</span>
                  <span className="text-sm font-semibold">Kanji</span>
                </div>
                <div className="mt-1 text-xs text-slate-600">Kanji Tome</div>
              </div>

              <div className="rounded-xl border p-3">
                <div className="flex items-center gap-2">
                  <span className={pill("pink")}>Pink</span>
                  <span className="text-sm font-semibold">Culture</span>
                </div>
                <div className="mt-1 text-xs text-slate-600">Culture Stack</div>
              </div>
            </div>

            <div className="mt-2 text-xs text-slate-600">
              Words continue on the main ladder (Green → Blue → Grey).
            </div>
          </div>

          {/* Special collections note */}
          <div className="mt-4 rounded-xl border p-3">
            <div className="text-sm font-semibold">Special collections (for now)</div>
            <div className="mt-1 text-sm text-slate-700">
              Katakana stops at <span className="font-semibold">Purple</span>, Kanji stops at{" "}
              <span className="font-semibold">Black</span>, and Culture stops at{" "}
              <span className="font-semibold">Pink</span>.
            </div>
            <div className="text-xs text-slate-500">
              Later, they can move to Green/Blue if you add typing-based checks.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
