"use client";

import { useState } from "react";
import { KANJI_DATA, type KanjiEntry } from "@/lib/kanjiData";

type Props = {
  onSelect: (kanji: string) => void;
  onClose: () => void;
};

const PIECE_GROUPS = [
  {
    label: "Common",
    pieces: ["言", "氵", "木", "口", "女", "手", "日", "月"],
  },
  {
    label: "People & feelings",
    pieces: ["人", "亻", "心", "忄", "子", "学", "力", "刀"],
  },
  {
    label: "Nature & materials",
    pieces: ["火", "灬", "土", "石", "金", "雨", "糸"],
  },
  {
    label: "Objects & body",
    pieces: ["車", "門", "食", "衣", "目", "耳"],
  },
];

const PIECE_NORMALIZATION: Record<string, string> = {
  氵: "水",
  扌: "手",
  亻: "人",
  忄: "心",
};

function normalizePiece(piece: string) {
  return PIECE_NORMALIZATION[piece] ?? piece;
}

export default function KanjiPicker({ onSelect, onClose }: Props) {
  const [selectedPieces, setSelectedPieces] = useState<string[]>([]);

  const filteredKanji = KANJI_DATA.filter((entry: KanjiEntry) => {
    if (selectedPieces.length === 0) return false;

    const normalizedSelected = selectedPieces.map(normalizePiece);
    const normalizedEntryPieces = entry.pieces.map(normalizePiece);

    return normalizedSelected.every((piece) =>
      normalizedEntryPieces.includes(piece)
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-900">
            Build the kanji from pieces
          </h2>
          <button
            onClick={onClose}
            className="text-sm text-stone-500 hover:text-stone-700"
          >
            Close
          </button>
        </div>

        {/* Instructions */}
        {/* Instructions */}
        <p className="mt-1 text-sm text-stone-500">
          Tap kanji to add them to the search box. Search when you're ready.
        </p>

        {/* Selected Pieces */}
        {selectedPieces.length > 0 && (
          <div className="mt-3 text-xs text-stone-500">
            Showing kanji containing ALL of: {selectedPieces.join(" + ")}
          </div>
        )}

        {/* Pieces Grid */}
        <div className="mt-4 rounded-xl border p-3 max-h-40 overflow-y-auto md:max-h-none md:overflow-visible">
          <div className="space-y-4">
            {PIECE_GROUPS.map((group) => (
              <div key={group.label}>
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">
                  {group.label}
                </div>

                <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
                  {group.pieces.map((piece) => {
                    const active = selectedPieces.includes(piece);

                    return (
                      <button
                        key={piece}
                        type="button"
                        onClick={() =>
                          setSelectedPieces((current) =>
                            current.includes(piece)
                              ? current.filter((p) => p !== piece)
                              : [...current, piece]
                          )
                        }
                        className={`rounded-lg border py-2 text-lg ${active
                          ? "bg-black text-white"
                          : "bg-white hover:bg-stone-100"
                          }`}
                      >
                        {piece}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Clear */}
        {selectedPieces.length > 0 && (
          <button
            onClick={() => setSelectedPieces([])}
            className="mt-2 text-xs text-stone-500 underline"
          >
            Clear selection
          </button>
        )}

        {/* Results */}
        <div className="mt-5">
          <div className="text-sm text-stone-600 mb-2">
            Matching kanji
          </div>

          <div className="flex flex-wrap gap-2">
            {selectedPieces.length > 0 && filteredKanji.length === 0 ? (
              <div className="text-sm text-stone-400">
                No kanji found
              </div>
            ) : (
              filteredKanji.map((entry) => (
                <button
                  key={`${entry.kanji}-${entry.pieces.join("-")}`}
                  type="button"
                  onClick={() => {
                    onSelect(entry.kanji);
                  }}
                  className="rounded-lg border px-4 py-3 text-2xl hover:bg-stone-100"
                >
                  {entry.kanji}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}