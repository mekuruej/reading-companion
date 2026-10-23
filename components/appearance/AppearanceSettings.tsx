"use client";

import {
  APPEARANCE_PALETTES,
  APPEARANCE_TREATMENTS,
  getAppearanceBackground,
  type AppearancePaletteId,
  type AppearanceTreatmentId,
} from "@/lib/appearance/palettes";
import { useAppearance } from "./AppearanceProvider";

export default function AppearanceSettings() {
  const { preferences, palette, setPalette, setTreatment } = useAppearance();

  return (
    <section aria-labelledby="appearance-heading" className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="max-w-2xl">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-500">Personalize MEKURU</p>
        <h2 id="appearance-heading" className="mt-2 text-2xl font-black text-stone-950">Appearance</h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Choose a color scheme and background treatment. Your choice is saved in this browser only.
          Colors apply to the header, Library Home, My Library, and Book Hub. Other pages keep their current colors.
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.8fr)]">
        <div className="space-y-5">
          <label className="block text-sm font-bold text-stone-800" htmlFor="appearance-palette">
            Color scheme
            <select
              id="appearance-palette"
              value={preferences.palette}
              onChange={(event) => setPalette(event.target.value as AppearancePaletteId)}
              className="mt-2 block min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm font-medium text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500"
            >
              {Object.entries(APPEARANCE_PALETTES).map(([id, item]) => (
                <option key={id} value={id}>{item.label}</option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-bold text-stone-800" htmlFor="appearance-treatment">
            Background treatment
            <select
              id="appearance-treatment"
              value={preferences.treatment}
              onChange={(event) => setTreatment(event.target.value as AppearanceTreatmentId)}
              className="mt-2 block min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm font-medium text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500"
            >
              {Object.entries(APPEARANCE_TREATMENTS).map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
          </label>
        </div>

        <div
          aria-label={`${palette.label}, ${APPEARANCE_TREATMENTS[preferences.treatment]} preview`}
          className="min-h-36 rounded-2xl border p-4"
          style={{
            background: getAppearanceBackground(preferences.palette, preferences.treatment),
            borderColor: palette.border,
            color: palette.text,
          }}
        >
          <p className="text-sm font-black">Live preview</p>
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border bg-white/90 px-3 py-2 text-sm shadow-sm" style={{ borderColor: palette.border }}>
            <span className="font-bold">MEKURU navigation</span>
            <span className="rounded-md px-2 py-1 text-xs font-semibold" style={{ backgroundColor: palette.navigation, color: palette.text }}>
              {palette.label}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
