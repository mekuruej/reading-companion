import fs from "node:fs";
import path from "node:path";

const [, , inputPath, outputPath = "lib/kanjiData.ts"] = process.argv;

if (!inputPath) {
  console.error(
    "Usage: node scripts/generate-kanji-data-from-kradfile.mjs <kradfile-utf8.txt> [output]"
  );
  process.exit(1);
}

const DISPLAY_COMPONENTS = new Map([
  ["化", "亻"],
  ["个", "𠆢"],
  ["并", "丷"],
  ["刈", "刂"],
  ["込", "辶"],
  ["尚", "⺌"],
  ["忙", "忄"],
  ["扎", "扌"],
  ["汁", "氵"],
  ["犯", "犭"],
  ["艾", "艹"],
  ["邦", "阝"],
  ["阡", "阝"],
  ["老", "耂"],
  ["杰", "灬"],
  ["礼", "礻"],
  ["疔", "疒"],
  ["初", "衤"],
  ["買", "罒"],
]);

function cleanComponents(parts) {
  const seen = new Set();
  const out = [];

  for (const part of parts) {
    const display = DISPLAY_COMPONENTS.get(part) ?? part;
    if (!display || seen.has(display)) continue;
    seen.add(display);
    out.push(display);
  }

  return out;
}

const input = fs.readFileSync(inputPath, "utf8");
const entries = [];

for (const rawLine of input.split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line || line.startsWith("#")) continue;

  const match = line.match(/^(\S+)\s+:\s+(.+)$/);
  if (!match) continue;

  const kanji = match[1];
  const pieces = cleanComponents(match[2].trim().split(/\s+/));

  if (kanji && pieces.length > 0) {
    entries.push({ kanji, pieces });
  }
}

entries.sort((a, b) => a.kanji.localeCompare(b.kanji, "ja"));

const components = Array.from(
  new Set(entries.flatMap((entry) => entry.pieces))
).sort((a, b) => a.localeCompare(b, "ja"));

const kanjiComponents = Object.fromEntries(
  entries.map((entry) => [entry.kanji, entry.pieces])
);

const kanjiByComponent = Object.fromEntries(
  components.map((component) => [
    component,
    entries
      .filter((entry) => entry.pieces.includes(component))
      .map((entry) => entry.kanji),
  ])
);

const generated = `// Kanji Data
//
// Generated from EDRDG KRADFILE.
// Source: http://ftp.edrdg.org/pub/Nihongo/kradfile.gz
// License/attribution: http://www.edrdg.org/edrdg/licence.html
// Run:
//   gzip -dc kradfile.gz | iconv -f EUC-JP -t UTF-8 > /tmp/kradfile.utf8
//   node scripts/generate-kanji-data-from-kradfile.mjs /tmp/kradfile.utf8

export type KanjiEntry = {
  kanji: string;
  pieces: string[];
};

export const KANJI_DATA: KanjiEntry[] = ${JSON.stringify(entries, null, 2)};

export const KANJI_COMPONENTS: Record<string, string[]> = ${JSON.stringify(
  kanjiComponents,
  null,
  2
)};

export const KANJI_BY_COMPONENT: Record<string, string[]> = ${JSON.stringify(
  kanjiByComponent,
  null,
  2
)};

export const KANJI_COMPONENT_LIST: string[] = ${JSON.stringify(components, null, 2)};
`;

fs.writeFileSync(path.resolve(outputPath), generated);
console.log(
  `Wrote ${entries.length} kanji entries and ${components.length} components to ${outputPath}`
);
