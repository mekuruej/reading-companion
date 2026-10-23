import type { CSSProperties } from "react";
import { APPEARANCE_PALETTES, DEFAULT_APPEARANCE, getAppearanceBackgroundImage } from "./palettes";

// CSS variables follow browser preferences; fallbacks preserve the server-rendered Classic default.
export const DEFAULT_APPEARANCE_PALETTE = APPEARANCE_PALETTES[DEFAULT_APPEARANCE.palette];

export const DEFAULT_PAGE_STYLE: CSSProperties = {
  backgroundColor: `var(--appearance-page-background, ${DEFAULT_APPEARANCE_PALETTE.page})`,
  backgroundImage: `var(--appearance-page-image, ${getAppearanceBackgroundImage(DEFAULT_APPEARANCE.palette, DEFAULT_APPEARANCE.treatment)})`,
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  backgroundAttachment: "fixed",
};

export const DEFAULT_NAVIGATION_STYLE: CSSProperties = {
  backgroundColor: `var(--appearance-navigation, ${DEFAULT_APPEARANCE_PALETTE.navigation})`,
  borderBottomColor: `var(--appearance-border, ${DEFAULT_APPEARANCE_PALETTE.border})`,
} as CSSProperties;
