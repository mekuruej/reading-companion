import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

function loadTsModule(relativePath) {
  const ts = require("typescript");
  const source = fs.readFileSync(path.join(root, relativePath), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const tsModule = { exports: {} };
  new Function("require", "module", "exports", compiled)(require, tsModule, tsModule.exports);
  return tsModule.exports;
}

function colorDistance(left, right) {
  const channels = (value) => value.match(/[a-f\d]{2}/gi).map((channel) => Number.parseInt(channel, 16));
  const a = channels(left);
  const b = channels(right);
  return Math.sqrt(a.reduce((sum, channel, index) => sum + (channel - b[index]) ** 2, 0));
}

function relativeLuminance(hex) {
  const channels = hex.match(/[a-f\d]{2}/gi).map((channel) => Number.parseInt(channel, 16) / 255);
  const linear = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(left, right) {
  const a = relativeLuminance(left);
  const b = relativeLuminance(right);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

test("appearance palettes provide five coordinated schemes and independent treatments", () => {
  const {
    APPEARANCE_PALETTES,
    APPEARANCE_TREATMENTS,
    DEFAULT_APPEARANCE,
    getAppearanceBackground,
    getAppearanceBackgroundImage,
    isAppearancePreferences,
    normalizeAppearancePreferences,
  } = loadTsModule("lib/appearance/palettes.ts");

  assert.deepEqual(Object.keys(APPEARANCE_PALETTES), ["classic", "lavender", "skyBlue", "sageGreen", "blushPeach"]);
  assert.deepEqual(Object.keys(APPEARANCE_TREATMENTS), ["solid", "neutralTouches"]);
  for (const palette of Object.values(APPEARANCE_PALETTES)) {
    for (const token of ["page", "navigation", "neutralTouchStart", "neutralTouchCenter", "neutralTouchEnd", "brandText", "text", "mutedText", "accent", "border", "surface", "surfaceMuted"]) {
      assert.match(palette[token], /^#[0-9a-f]{6}$/i, `${palette.label} is missing ${token}`);
    }
    assert.ok(contrastRatio("#ffffff", palette.brandText) >= 4.5, `${palette.label} wordmark should be readable on white`);
    assert.ok(colorDistance(palette.page, palette.navigation) >= 60, `${palette.label} navigation should be visibly distinct from the page surface`);
    assert.ok(contrastRatio(palette.navigation, palette.text) >= 4.5, `${palette.label} active navigation text should meet WCAG AA contrast`);
    assert.ok(contrastRatio(palette.navigation, palette.mutedText) >= 4.5, `${palette.label} inactive navigation text should meet WCAG AA contrast`);
    const paletteVariationThreshold = palette.label === "Classic" ? 10 : 24;
    assert.ok(colorDistance(palette.page, palette.neutralTouchStart) >= paletteVariationThreshold, `${palette.label} gradient start should be visible against Solid`);
    assert.ok(colorDistance(palette.page, palette.neutralTouchEnd) >= paletteVariationThreshold, `${palette.label} gradient return should be visible against Solid`);
    const neutralChannels = palette.neutralTouchCenter.match(/[a-f\d]{2}/gi).map((channel) => Number.parseInt(channel, 16));
    assert.ok(Math.max(...neutralChannels) - Math.min(...neutralChannels) <= 8, `${palette.label} gradient center should be near-neutral`);
    if (palette.label === "Lavender") {
      assert.ok(colorDistance(palette.page, palette.neutralTouchCenter) >= 8, "Lavender near-neutral area should remain subtly distinguishable");
    }
    assert.equal(getAppearanceBackground(Object.keys(APPEARANCE_PALETTES).find((id) => APPEARANCE_PALETTES[id] === palette), "solid"), palette.page);
  }

  const lavenderBackgrounds = Object.keys(APPEARANCE_TREATMENTS).map((treatment) =>
    getAppearanceBackground("lavender", treatment),
  );
  assert.equal(new Set(lavenderBackgrounds).size, 2);
  assert.equal(getAppearanceBackgroundImage("lavender", "solid"), "none");
  const lavenderNeutralTouches = getAppearanceBackgroundImage("lavender", "neutralTouches");
  assert.match(lavenderNeutralTouches, /^linear-gradient\(118deg/);
  assert.match(lavenderNeutralTouches, /#e2d4ee 0%, #e2d4ee 17%/);
  assert.match(lavenderNeutralTouches, /#f3f1ef 48%, #f3f1ef 68%/);
  assert.match(lavenderNeutralTouches, /#dfd0e9 100%/);
  assert.ok(colorDistance("#e2d4ee", "#f3f1ef") >= 24, "Lavender should transition visibly into the neutral area");
  assert.ok(colorDistance("#f3f1ef", "#dfd0e9") >= 24, "Neutral area should transition visibly back to lavender");
  assert.deepEqual(
    Object.values(APPEARANCE_PALETTES).map((palette) => palette.brandText),
    ["#38343b", "#493065", "#244d70", "#31563d", "#793d53"],
  );
  assert.deepEqual(
    [APPEARANCE_PALETTES.classic.page, APPEARANCE_PALETTES.classic.navigation, APPEARANCE_PALETTES.classic.neutralTouchStart, APPEARANCE_PALETTES.classic.neutralTouchCenter, APPEARANCE_PALETTES.classic.neutralTouchEnd],
    ["#eeecea", "#c9c5c4", "#e7e5e3", "#f7f6f3", "#e5e3e4"],
  );
  for (const paletteId of Object.keys(APPEARANCE_PALETTES)) {
    const neutralTouches = getAppearanceBackgroundImage(paletteId, "neutralTouches");
    const palette = APPEARANCE_PALETTES[paletteId];
    assert.equal(
      neutralTouches,
      `linear-gradient(118deg, ${palette.neutralTouchStart} 0%, ${palette.neutralTouchStart} 17%, ${palette.neutralTouchCenter} 48%, ${palette.neutralTouchCenter} 68%, ${palette.neutralTouchEnd} 100%)`,
    );
    if (paletteId === "lavender") {
      assert.match(neutralTouches, /#e2d4ee 0%, #e2d4ee 17%, #f3f1ef 48%, #f3f1ef 68%, #dfd0e9 100%/);
    }
  }
  assert.equal(DEFAULT_APPEARANCE.palette, "classic");
  assert.equal(DEFAULT_APPEARANCE.treatment, "neutralTouches");
  assert.ok(isAppearancePreferences(DEFAULT_APPEARANCE));
  assert.equal(isAppearancePreferences({ palette: "unknown", treatment: "solid" }), false);
  assert.equal(isAppearancePreferences({ palette: "toString", treatment: "solid" }), false);
  assert.deepEqual(normalizeAppearancePreferences({ palette: "lavender", treatment: "softGradient" }), {
    palette: "lavender",
    treatment: "neutralTouches",
  });
  assert.deepEqual(normalizeAppearancePreferences({ palette: "skyBlue", treatment: "atmosphericGradient" }), {
    palette: "skyBlue",
    treatment: "neutralTouches",
  });
  assert.deepEqual(normalizeAppearancePreferences({ palette: "sageGreen", treatment: "neutralTouches" }), {
    palette: "sageGreen",
    treatment: "neutralTouches",
  });
  for (const palette of ["lavender", "skyBlue", "sageGreen", "blushPeach"]) {
    assert.deepEqual(normalizeAppearancePreferences({ palette, treatment: "solid" }), { palette, treatment: "solid" });
  }
  assert.equal(normalizeAppearancePreferences({ palette: "unknown", treatment: "softGradient" }), null);
});


test("shared surfaces use appearance variables without profile or database dependencies", () => {
  const helper = fs.readFileSync(path.join(root, "lib/appearance/defaultAppearance.ts"), "utf8");
  assert.match(helper, /APPEARANCE_PALETTES\[DEFAULT_APPEARANCE.palette\]/);
  assert.match(helper, /getAppearanceBackgroundImage\(DEFAULT_APPEARANCE.palette, DEFAULT_APPEARANCE.treatment\)/);
  assert.doesNotMatch(helper, /localStorage|supabase|fetch\(|useAppearance|AppearanceProvider/);
  for (const file of ["app/(protected)/library/page.tsx", "app/(protected)/users/[username]/books/page.tsx", "app/(protected)/books/[userBookId]/page.tsx"]) {
    const page = fs.readFileSync(path.join(root, file), "utf8");
    assert.match(page, /<main className="min-h-screen [^"]*" style=\{DEFAULT_PAGE_STYLE\}/);
  }
  const header = fs.readFileSync(path.join(root, "components/Header.tsx"), "utf8");
  assert.match(header, /style=\{DEFAULT_NAVIGATION_STYLE\}/);
  assert.match(header, /--appearance-brand-text/);
  assert.doesNotMatch(header, /useAppearance|AppearanceProvider|localStorage/);
});

test("Classic background stops retain readable primary/body text and coordinated navigation", () => {
  const { APPEARANCE_PALETTES } = loadTsModule("lib/appearance/palettes.ts");
  const p = APPEARANCE_PALETTES.classic;
  for (const bg of [p.page, p.neutralTouchStart, p.neutralTouchCenter, p.neutralTouchEnd]) {
    for (const text of [p.text, p.mutedText, "#475569", "#4b5563"]) {
      assert.ok(contrastRatio(bg, text) >= 4.5, `${text} on ${bg} should meet normal-text contrast`);
    }
  }
  assert.ok(contrastRatio(p.navigation, p.text) >= 4.5);
  assert.ok(contrastRatio(p.navigation, p.mutedText) >= 4.5);
  assert.ok(contrastRatio(p.navigation, p.accent) >= 3);
});

test("all selectable backgrounds retain readable existing body text", () => {
  const { APPEARANCE_PALETTES } = loadTsModule("lib/appearance/palettes.ts");
  for (const p of Object.values(APPEARANCE_PALETTES)) {
    for (const bg of [p.page, p.neutralTouchStart, p.neutralTouchCenter, p.neutralTouchEnd]) {
      for (const text of [p.text, p.mutedText, "#475569", "#4b5563"]) {
        assert.ok(contrastRatio(bg, text) >= 4.5, `${p.label}: ${text} on ${bg}`);
      }
    }
  }
});
