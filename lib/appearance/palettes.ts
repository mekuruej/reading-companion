export const APPEARANCE_PALETTES = {
  classic: {
    label: "Classic",
    page: "#eeecea",
    pageMid: "#e3e1df",
    atmosphereA: "#dedbd8",
    atmosphereB: "#e5e2df",
    navigation: "#c9c5c4",
    neutralTouchStart: "#e7e5e3",
    neutralTouchCenter: "#f7f6f3",
    neutralTouchEnd: "#e5e3e4",
    brandText: "#38343b",
    text: "#38343b",
    mutedText: "#514b52",
    accent: "#665b67",
    border: "#d7d3d0",
    surface: "#fbfaf8",
    surfaceMuted: "#f4f2ef",
  },
  lavender: {
    label: "Lavender",
    page: "#efe8f5",
    pageMid: "#e4d9ef",
    atmosphereA: "#d9c5ed",
    atmosphereB: "#f1d6e4",
    navigation: "#bca4d3",
    neutralTouchStart: "#e2d4ee",
    neutralTouchCenter: "#f3f1ef",
    neutralTouchEnd: "#dfd0e9",
    brandText: "#493065",
    text: "#342b42",
    mutedText: "#44384e",
    accent: "#715b8f",
    border: "#cec1dc",
    surface: "#fbf9fd",
    surfaceMuted: "#f5f1f8",
  },
  skyBlue: {
    label: "Sky Blue",
    page: "#edf4f8",
    pageMid: "#d7e7f1",
    atmosphereA: "#c9e0ee",
    atmosphereB: "#d9e2f2",
    navigation: "#94b6d2",
    neutralTouchStart: "#d2e3ef",
    neutralTouchCenter: "#f5f4f1",
    neutralTouchEnd: "#cbdfee",
    brandText: "#244d70",
    text: "#263b4b",
    mutedText: "#2b4556",
    accent: "#477c9a",
    border: "#bfd6e3",
    surface: "#f9fcfe",
    surfaceMuted: "#f0f7fa",
  },
  sageGreen: {
    label: "Sage Green",
    page: "#eff4ed",
    pageMid: "#dde9d9",
    atmosphereA: "#ccdfca",
    atmosphereB: "#e4ebd1",
    navigation: "#9bb9a3",
    neutralTouchStart: "#d9e7d9",
    neutralTouchCenter: "#f4f3ed",
    neutralTouchEnd: "#d2e2d5",
    brandText: "#31563d",
    text: "#2e3d2d",
    mutedText: "#354834",
    accent: "#668365",
    border: "#c5d7c1",
    surface: "#fafcf9",
    surfaceMuted: "#f2f7f0",
  },
  blushPeach: {
    label: "Blush Peach",
    page: "#fbecf0",
    pageMid: "#f0d3df",
    atmosphereA: "#efc6d5",
    atmosphereB: "#f1d5c4",
    navigation: "#dba9b4",
    neutralTouchStart: "#f0d7e1",
    neutralTouchCenter: "#f5f2ef",
    neutralTouchEnd: "#efd3de",
    brandText: "#793d53",
    text: "#4b2d37",
    mutedText: "#593c46",
    accent: "#b45e7b",
    border: "#e8bfcd",
    surface: "#fff9fb",
    surfaceMuted: "#fbf1f4",
  },
} as const;

export const APPEARANCE_TREATMENTS = {
  solid: "Solid",
  neutralTouches: "Neutral Touches",
} as const;

export type AppearancePaletteId = keyof typeof APPEARANCE_PALETTES;
export type AppearanceTreatmentId = keyof typeof APPEARANCE_TREATMENTS;

export type AppearancePreferences = {
  palette: AppearancePaletteId;
  treatment: AppearanceTreatmentId;
};

export const DEFAULT_APPEARANCE: AppearancePreferences = {
  palette: "classic",
  treatment: "neutralTouches",
};

export function isAppearancePreferences(value: unknown): value is AppearancePreferences {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AppearancePreferences>;
  return candidate.palette != null && Object.prototype.hasOwnProperty.call(APPEARANCE_PALETTES, candidate.palette) &&
    candidate.treatment != null && Object.prototype.hasOwnProperty.call(APPEARANCE_TREATMENTS, candidate.treatment);
}

export function normalizeAppearancePreferences(value: unknown): AppearancePreferences | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as { palette?: unknown; treatment?: unknown };
  if (typeof candidate.palette !== "string" || !Object.prototype.hasOwnProperty.call(APPEARANCE_PALETTES, candidate.palette)) {
    return null;
  }

  let treatment: AppearanceTreatmentId;
  if (candidate.treatment === "solid") {
    treatment = "solid";
  } else if (
    candidate.treatment === "neutralTouches" ||
    candidate.treatment === "softGradient" ||
    candidate.treatment === "atmosphericGradient"
  ) {
    treatment = "neutralTouches";
  } else {
    return null;
  }

  return { palette: candidate.palette as AppearancePaletteId, treatment };
}

export function getAppearanceBackground(
  paletteId: AppearancePaletteId,
  treatment: AppearanceTreatmentId,
) {
  const palette = APPEARANCE_PALETTES[paletteId];
  if (treatment === "solid") return palette.page;
  return `${getAppearanceBackgroundImage(paletteId, treatment)}, ${palette.page}`;
}

export function getAppearanceBackgroundImage(
  paletteId: AppearancePaletteId,
  treatment: AppearanceTreatmentId,
) {
  const palette = APPEARANCE_PALETTES[paletteId];
  if (treatment === "solid") return "none";
  return `linear-gradient(118deg, ${palette.neutralTouchStart} 0%, ${palette.neutralTouchStart} 17%, ${palette.neutralTouchCenter} 48%, ${palette.neutralTouchCenter} 68%, ${palette.neutralTouchEnd} 100%)`;
}
