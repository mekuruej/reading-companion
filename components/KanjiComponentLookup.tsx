"use client";

import { useEffect, useMemo, useState } from "react";
import {
  KANJI_BY_COMPONENT,
  KANJI_COMPONENTS,
  KANJI_COMPONENT_LIST,
} from "@/lib/kanjiData";

type KanjiComponentLookupProps = {
  onPickKanji: (kanji: string) => void;
  resetKey?: number;
};

const COMPONENT_STROKE_GROUPS = [
  ["一", "｜", "丶", "ノ", "乙", "亅"],
  [
    "二",
    "亠",
    "人",
    "亻",
    "𠆢",
    "儿",
    "入",
    "ハ",
    "丷",
    "冂",
    "冖",
    "冫",
    "几",
    "凵",
    "刀",
    "刂",
    "力",
    "勹",
    "匕",
    "匚",
    "十",
    "卩",
    "厂",
    "厶",
    "又",
    "マ",
    "ユ",
    "九",
    "乃",
  ],
  [
    "口",
    "囗",
    "土",
    "士",
    "夂",
    "夕",
    "大",
    "女",
    "子",
    "宀",
    "寸",
    "小",
    "⺌",
    "尢",
    "尸",
    "屮",
    "山",
    "川",
    "巛",
    "工",
    "已",
    "巾",
    "干",
    "幺",
    "广",
    "廴",
    "廾",
    "弋",
    "弓",
    "ヨ",
    "彑",
    "彡",
    "彳",
    "忄",
    "扌",
    "氵",
    "犭",
    "艹",
    "辶",
    "阝",
    "也",
    "亡",
    "及",
    "久",
    "乞",
  ],
  [
    "心",
    "戈",
    "戸",
    "手",
    "支",
    "攵",
    "文",
    "斗",
    "斤",
    "方",
    "无",
    "日",
    "曰",
    "月",
    "木",
    "欠",
    "止",
    "歹",
    "殳",
    "比",
    "毛",
    "氏",
    "气",
    "水",
    "火",
    "灬",
    "爪",
    "父",
    "爻",
    "爿",
    "片",
    "牛",
    "犬",
    "礻",
    "耂",
    "王",
    "元",
    "井",
    "勿",
    "尤",
    "五",
    "屯",
    "巴",
    "卜",
  ],
  [
    "毋",
    "玄",
    "瓦",
    "甘",
    "生",
    "用",
    "田",
    "疋",
    "疒",
    "癶",
    "白",
    "皮",
    "皿",
    "罒",
    "目",
    "矛",
    "矢",
    "石",
    "示",
    "禹",
    "禾",
    "穴",
    "立",
    "衤",
    "世",
    "巨",
    "冊",
    "母",
    "牙",
  ],
  [
    "瓜",
    "竹",
    "米",
    "糸",
    "缶",
    "羊",
    "羽",
    "而",
    "耒",
    "耳",
    "聿",
    "肉",
    "自",
    "至",
    "臼",
    "舌",
    "舟",
    "艮",
    "色",
    "虍",
    "虫",
    "血",
    "行",
    "衣",
    "西",
    "舛",
  ],
  [
    "臣",
    "見",
    "角",
    "言",
    "谷",
    "豆",
    "豕",
    "豸",
    "貝",
    "赤",
    "走",
    "足",
    "身",
    "車",
    "辛",
    "辰",
    "酉",
    "釆",
    "里",
    "麦",
  ],
  ["金", "長", "門", "隶", "隹", "雨", "青", "非", "奄", "岡", "免", "斉"],
  ["面", "革", "韋", "音", "頁", "風", "飛", "食", "首", "香", "品", "韭"],
  ["馬", "骨", "高", "髟", "鬥", "鬯", "鬲", "鬼", "竜", "黒"],
  ["魚", "鳥", "鹵", "鹿", "麻", "亀", "黄"],
  ["黍", "黹", "無", "歯"],
  ["鼠", "鼎", "鼓", "黽"],
  ["鼻", "齊", "滴"],
  ["龠"],
];

const COMPONENT_STROKE_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 17];

export const COMPONENT_STROKE_INFO = new Map(
  COMPONENT_STROKE_GROUPS.flatMap((group, groupIndex) =>
    group.map((component, componentIndex) => [
      component,
      { strokes: COMPONENT_STROKE_NUMBERS[groupIndex] ?? 99, rank: componentIndex },
    ])
  )
);

export function getComponentStrokeCount(component: string) {
  return COMPONENT_STROKE_INFO.get(component)?.strokes ?? null;
}

function estimatedKanjiStrokeCount(kanji: string) {
  const pieces = KANJI_COMPONENTS[kanji] ?? [];
  if (pieces.length === 0) return null;

  const knownStrokes = pieces
    .map((piece) => getComponentStrokeCount(piece))
    .filter((strokes): strokes is number => strokes != null);

  if (knownStrokes.length === 0) return null;
  return knownStrokes.reduce((total, strokes) => total + strokes, 0);
}

function sortComponents(components: string[]) {
  return [...components].sort((a, b) => {
    const aInfo = COMPONENT_STROKE_INFO.get(a);
    const bInfo = COMPONENT_STROKE_INFO.get(b);

    if (aInfo && bInfo) {
      if (aInfo.strokes !== bInfo.strokes) return aInfo.strokes - bInfo.strokes;
      if (aInfo.rank !== bInfo.rank) return aInfo.rank - bInfo.rank;
    }

    if (aInfo) return -1;
    if (bInfo) return 1;

    return a.localeCompare(b, "ja");
  });
}

function groupComponentsByStroke(components: string[]) {
  const grouped = new Map<number, string[]>();

  for (const component of components) {
    const strokes = COMPONENT_STROKE_INFO.get(component)?.strokes ?? 99;
    grouped.set(strokes, [...(grouped.get(strokes) ?? []), component]);
  }

  return Array.from(grouped.entries()).sort(([a], [b]) => a - b);
}

function sortKanjiResults(kanji: string[]) {
  return [...kanji].sort((a, b) => {
    const aStrokes = estimatedKanjiStrokeCount(a);
    const bStrokes = estimatedKanjiStrokeCount(b);

    if (aStrokes != null && bStrokes != null && aStrokes !== bStrokes) {
      return aStrokes - bStrokes;
    }

    if (aStrokes != null && bStrokes == null) return -1;
    if (aStrokes == null && bStrokes != null) return 1;

    return a.localeCompare(b, "ja");
  });
}

function groupKanjiByEstimatedStroke(kanji: string[]) {
  const grouped = new Map<number, string[]>();

  for (const item of kanji) {
    const strokes = estimatedKanjiStrokeCount(item) ?? 99;
    grouped.set(strokes, [...(grouped.get(strokes) ?? []), item]);
  }

  return Array.from(grouped.entries()).sort(([a], [b]) => a - b);
}

export default function KanjiComponentLookup({
  onPickKanji,
  resetKey = 0,
}: KanjiComponentLookupProps) {
  const [selectedPieces, setSelectedPieces] = useState<string[]>([]);
  const [recentKanji, setRecentKanji] = useState<string[]>([]);

  useEffect(() => {
    setSelectedPieces([]);
  }, [resetKey]);

  const pieces = useMemo(() => {
    return sortComponents(KANJI_COMPONENT_LIST);
  }, []);

  const pieceGroups = useMemo(() => groupComponentsByStroke(pieces), [pieces]);

  const filteredKanji = useMemo(() => {
    if (selectedPieces.length === 0) return [];

    const [firstPiece, ...restPieces] = selectedPieces;
    const firstSet = new Set(KANJI_BY_COMPONENT[firstPiece] ?? []);

    return sortKanjiResults(
      Array.from(firstSet).filter((kanji) =>
        restPieces.every((piece) => KANJI_COMPONENTS[kanji]?.includes(piece))
      )
    );
  }, [selectedPieces]);

  const kanjiGroups = useMemo(() => groupKanjiByEstimatedStroke(filteredKanji), [filteredKanji]);

  function togglePiece(piece: string) {
    setSelectedPieces((prev) =>
      prev.includes(piece)
        ? prev.filter((item) => item !== piece)
        : [...prev, piece]
    );
  }

  function pickKanji(kanji: string) {
    setRecentKanji((prev) => [kanji, ...prev.filter((item) => item !== kanji)].slice(0, 10));
    onPickKanji(kanji);
  }

  return (
    <details className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-stone-800">
        Find kanji by parts
      </summary>

      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-xs leading-5 text-stone-500">
          Pick parts you recognize, then tap a kanji to add it to your word.
        </p>

        {selectedPieces.length > 0 ? (
          <div className="flex flex-col items-start gap-1 sm:items-end">
            <button
              type="button"
              onClick={() => setSelectedPieces([])}
              className="shrink-0 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:border-stone-500 hover:bg-stone-100"
            >
              Clear parts
            </button>
            <div className="rounded-full bg-sky-100 px-3 py-1 text-[11px] font-semibold text-sky-900">
              Scroll down to choose more radicals
            </div>
          </div>
        ) : null}
      </div>

      {selectedPieces.length > 0 ? (
        <div className="mt-3 rounded-xl border border-stone-200 bg-white p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
            Possible kanji
          </div>

          {filteredKanji.length > 0 ? (
            <div className="space-y-2">
              {kanjiGroups.map(([strokes, groupKanji]) => (
                <div key={strokes} className="flex flex-wrap gap-2">
                  <div className="flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-stone-900 px-2 text-sm font-black text-white">
                    {strokes === 99 ? "?" : strokes}
                  </div>

                  {groupKanji.map((kanji) => (
                    <button
                      key={kanji}
                      type="button"
                      onClick={() => pickKanji(kanji)}
                      className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-2xl font-semibold text-stone-900 transition hover:border-stone-400 hover:bg-white"
                      title={`Add ${kanji}${strokes !== 99 ? ` · about ${strokes} strokes from selected parts` : ""}`}
                    >
                      {kanji}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-stone-500">
              No matches yet. Try fewer parts or a different piece.
            </p>
          )}
        </div>
      ) : null}

      <div className="mt-3 max-h-44 overflow-y-auto rounded-xl border border-stone-100 bg-white/60 p-2">
        <div className="flex flex-wrap gap-2">
          {pieceGroups.map(([strokes, groupPieces]) => (
            <div key={strokes} className="contents">
              <div className="flex min-h-9 min-w-9 items-center justify-center rounded-xl bg-stone-900 px-2 text-sm font-black text-white">
                {strokes === 99 ? "?" : strokes}
              </div>

              {groupPieces.map((piece) => {
                const selected = selectedPieces.includes(piece);

                return (
                  <button
                    key={piece}
                    type="button"
                    onClick={() => togglePiece(piece)}
                    className={`min-h-9 rounded-xl border px-3 py-1.5 text-lg font-semibold transition ${
                      selected
                        ? "border-sky-500 bg-sky-100 text-sky-950 ring-2 ring-sky-300"
                        : "border-stone-200 bg-white text-stone-800 hover:bg-stone-100"
                    }`}
                  >
                    {piece}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {recentKanji.length > 0 ? (
        <div className="mt-3 rounded-xl border border-stone-200 bg-white p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Recent kanji lookup
          </div>
          <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-2xl font-semibold text-stone-900">
            {recentKanji.map((kanji, index) => (
              <span key={kanji}>
                {kanji}
                {index < recentKanji.length - 1 ? (
                  <span className="text-base font-normal text-stone-400">、</span>
                ) : null}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </details>
  );
}
