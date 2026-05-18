"use client";

import { useMemo, useState } from "react";
import {
  KANJI_BY_COMPONENT,
  KANJI_COMPONENTS,
  KANJI_COMPONENT_LIST,
} from "@/lib/kanjiData";

type KanjiComponentLookupProps = {
  onPickKanji: (kanji: string) => void;
};

// Later: replace or supplement this with component metadata
// for stroke count, visual group, and learner-level ordering.
// For now, this list only controls which parts appear first.
const COMMON_COMPONENT_ORDER = [
  "人",
  "亻",
  "口",
  "日",
  "月",
  "木",
  "水",
  "氵",
  "火",
  "灬",
  "土",
  "金",
  "女",
  "子",
  "心",
  "忄",
  "手",
  "扌",
  "目",
  "耳",
  "言",
  "糸",
  "艹",
  "⺌",
  "宀",
  "門",
  "車",
  "食",
  "馬",
  "魚",
  "雨",
  "山",
  "川",
  "田",
  "石",
  "竹",
  "米",
  "貝",
  "足",
  "辶",
  "阝",
  "刂",
  "力",
  "刀",
  "弓",
  "犬",
  "犭",
  "虫",
  "鳥",
  "頁",
  "衣",
  "衤",
  "示",
  "礻",
];

const COMMON_COMPONENT_RANK = new Map(
  COMMON_COMPONENT_ORDER.map((component, index) => [component, index])
);

function sortComponents(components: string[]) {
  return [...components].sort((a, b) => {
    const aRank = COMMON_COMPONENT_RANK.get(a);
    const bRank = COMMON_COMPONENT_RANK.get(b);

    if (aRank != null && bRank != null) return aRank - bRank;
    if (aRank != null) return -1;
    if (bRank != null) return 1;

    return a.localeCompare(b, "ja");
  });
}

export default function KanjiComponentLookup({
  onPickKanji,
}: KanjiComponentLookupProps) {
  const [selectedPieces, setSelectedPieces] = useState<string[]>([]);
  const [componentSearch, setComponentSearch] = useState("");

  const pieces = useMemo(() => {
    const query = componentSearch.trim();
    if (!query) return sortComponents(KANJI_COMPONENT_LIST);

    return sortComponents(
      KANJI_COMPONENT_LIST.filter((piece) => piece.includes(query))
    );
  }, [componentSearch]);

  const filteredKanji = useMemo(() => {
    if (selectedPieces.length === 0) return [];

    const [firstPiece, ...restPieces] = selectedPieces;
    const firstSet = new Set(KANJI_BY_COMPONENT[firstPiece] ?? []);

    return Array.from(firstSet).filter((kanji) =>
      restPieces.every((piece) => KANJI_COMPONENTS[kanji]?.includes(piece))
    );
  }, [selectedPieces]);

  function togglePiece(piece: string) {
    setSelectedPieces((prev) =>
      prev.includes(piece)
        ? prev.filter((item) => item !== piece)
        : [...prev, piece]
    );
  }

  return (
    <details className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-stone-800">
        Find kanji by parts
      </summary>

      <p className="mt-2 text-xs leading-5 text-stone-500">
        Pick parts you recognize, then tap a kanji to add it to your word.
      </p>

      <input
        value={componentSearch}
        onChange={(event) => setComponentSearch(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        placeholder="Filter parts, e.g. 氵, 木, 言"
        className="mt-3 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-100"
      />

      <div className="mt-3 flex max-h-44 flex-wrap gap-2 overflow-y-auto rounded-xl border border-stone-100 bg-white/60 p-2">
        {pieces.map((piece) => {
          const selected = selectedPieces.includes(piece);

          return (
            <button
              key={piece}
              type="button"
              onClick={() => togglePiece(piece)}
              className={`min-h-9 rounded-xl border px-3 py-1.5 text-lg font-semibold transition ${
                selected
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-200 bg-white text-stone-800 hover:bg-stone-100"
              }`}
            >
              {piece}
            </button>
          );
        })}
      </div>

      {selectedPieces.length > 0 ? (
        <div className="mt-3 rounded-xl border border-stone-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Possible kanji
            </div>

            <button
              type="button"
              onClick={() => setSelectedPieces([])}
              className="text-xs font-medium text-stone-500 hover:text-stone-900"
            >
              Clear parts
            </button>
          </div>

          {filteredKanji.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {filteredKanji.map((kanji) => (
                <button
                  key={kanji}
                  type="button"
                  onClick={() => onPickKanji(kanji)}
                  className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-2xl font-semibold text-stone-900 transition hover:border-stone-400 hover:bg-white"
                  title={`Add ${kanji}`}
                >
                  {kanji}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-stone-500">
              No matches yet. Try fewer parts or a different piece.
            </p>
          )}
        </div>
      ) : null}
    </details>
  );
}
