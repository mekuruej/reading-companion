import type { CSSProperties } from "react";
import { APPEARANCE_PALETTES, DEFAULT_APPEARANCE, getAppearanceBackgroundImage } from "./palettes";

// Fixed default design; no browser preferences or appearance provider in this release.
export const DEFAULT_APPEARANCE_PALETTE = APPEARANCE_PALETTES[DEFAULT_APPEARANCE.palette];

export const DEFAULT_PAGE_STYLE: CSSProperties = {
  backgroundColor: DEFAULT_APPEARANCE_PALETTE.page,
  backgroundImage: getAppearanceBackgroundImage(DEFAULT_APPEARANCE.palette, DEFAULT_APPEARANCE.treatment),
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  backgroundAttachment: "fixed",
};

export const DEFAULT_NAVIGATION_STYLE: CSSProperties = {
  backgroundColor: DEFAULT_APPEARANCE_PALETTE.navigation,
  borderBottomColor: DEFAULT_APPEARANCE_PALETTE.border,
  "--appearance-text": DEFAULT_APPEARANCE_PALETTE.text,
  "--appearance-muted-text": DEFAULT_APPEARANCE_PALETTE.mutedText,
  "--appearance-accent": DEFAULT_APPEARANCE_PALETTE.accent,
} as CSSProperties;
