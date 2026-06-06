type KanjiRecallMode = "kanjiForReading" | "wordForKanji";
type KanjiRecallResult = "correct" | "wrong" | "shown" | "unverified" | null;

type KanjiRecallCard = {
  sourceWord: string;
  sourceReading: string;
  sourceMeaning: string | null;
  bookTitle: string | null;
};

type KanjiRecallPanelProps = {
  card: KanjiRecallCard;
  recallMode: KanjiRecallMode;
  recallRevealed: boolean;
  recallResult: KanjiRecallResult;
  recallMatchedWord: string | null;
  recallMatchedCard: KanjiRecallCard | null;
  guessInput: string;
  onGuessChange: (value: string) => void;
  onSubmitGuess: () => void;
  onRevealRecallCard: () => void;
  onNext: () => void;
};

export default function KanjiRecallPanel({
  card,
  recallMode,
  recallRevealed,
  recallResult,
  recallMatchedWord,
  recallMatchedCard,
  guessInput,
  onGuessChange,
  onSubmitGuess,
  onRevealRecallCard,
  onNext,
}: KanjiRecallPanelProps) {
  const exampleCard = recallMatchedCard ?? card;

  return (
    <div
      className="mt-4 rounded-xl border bg-slate-50 p-4 text-left"
      onClick={(event) => event.stopPropagation()}
    >
      {!recallRevealed ? (
        <>
          <p className="text-center text-sm font-medium text-slate-800">
            {recallMode === "kanjiForReading"
              ? "What kanji character does this word use?"
              : "Can you come up with the word Mekuru is thinking of?"}
          </p>

          <p className="mt-1 text-center text-xs text-slate-500">
            {recallMode === "kanjiForReading"
              ? card.sourceReading
              : "Think of the level filter during your guess!"}
          </p>

          <input
            type="text"
            value={guessInput}
            onChange={(event) => onGuessChange(event.target.value)}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.stopPropagation();
                onSubmitGuess();
              }
            }}
            placeholder={
              recallMode === "kanjiForReading"
                ? "Type the kanji"
                : "Type a word with this kanji"
            }
            className="mt-3 w-full rounded border px-3 py-2 text-base"
          />

          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onSubmitGuess();
              }}
              className="rounded bg-gray-700 px-4 py-2 text-white"
            >
              Check
            </button>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onRevealRecallCard();
              }}
              className="rounded bg-gray-200 px-4 py-2"
            >
              Show me
            </button>
          </div>
        </>
      ) : (
        <>
          {recallMode === "wordForKanji" && recallResult === "correct" ? (
            <div className="relative overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-center text-amber-950 shadow-sm">
              <span className="pointer-events-none absolute left-5 top-4 h-2 w-2 animate-[kanjiRecallBurst_900ms_ease-out_forwards] rounded-full bg-amber-400" />
              <span className="pointer-events-none absolute right-8 top-5 h-1.5 w-1.5 animate-[kanjiRecallBurst_1000ms_ease-out_120ms_forwards] rounded-full bg-rose-300" />
              <span className="pointer-events-none absolute bottom-5 left-1/2 h-1.5 w-1.5 animate-[kanjiRecallBurst_950ms_ease-out_220ms_forwards] rounded-full bg-sky-300" />

              <div className="text-2xl font-black">Amazing!</div>

              <div className="mt-1 text-sm font-semibold">
                You found the word Mekuru was thinking of.
              </div>

              <style jsx>{`
                @keyframes kanjiRecallBurst {
                  0% {
                    opacity: 0;
                    transform: scale(0.2);
                    box-shadow:
                      0 0 0 0 currentColor,
                      0 0 0 0 currentColor,
                      0 0 0 0 currentColor;
                  }
                  35% {
                    opacity: 1;
                  }
                  100% {
                    opacity: 0;
                    transform: scale(1.25);
                    box-shadow:
                      20px -12px 0 -1px currentColor,
                      -18px -8px 0 -1px currentColor,
                      3px 20px 0 -1px currentColor;
                  }
                }
              `}</style>
            </div>
          ) : (
            <p className="text-center text-sm font-medium text-slate-800">
              {recallMode === "wordForKanji" && recallResult === "unverified"
                ? `Sorry! It was ${card.sourceWord}.`
                : recallMode === "wordForKanji" && recallResult === "wrong"
                  ? `Sorry! It was ${card.sourceWord}.`
                  : recallResult === "correct"
                    ? "✅ That works!"
                    : recallResult === "wrong"
                      ? `Sorry! It was ${card.sourceWord}.`
                      : `It was ${card.sourceWord}.`}
            </p>
          )}

          {recallMatchedWord && recallMode !== "wordForKanji" ? (
            <p
              className={`mt-1 text-center text-sm ${
                recallResult === "unverified" ? "text-amber-700" : "text-green-700"
              }`}
            >
              Your answer: {recallMatchedWord}
            </p>
          ) : null}

          {recallMode !== "wordForKanji" ? (
            <div className="mt-3 rounded-xl border bg-white p-3 text-center">
              <div className="text-xs uppercase tracking-wide text-slate-400">
                Example from the bank
              </div>

              <div className="text-lg font-semibold">
                {exampleCard.sourceWord}
              </div>

              <div className="mt-1 text-xs text-slate-400">
                {exampleCard.bookTitle
                  ? `Seen in: ${exampleCard.bookTitle}`
                  : "Shared kanji bank"}
              </div>

              {exampleCard.sourceReading ? (
                <div className="mt-1 text-sm text-slate-500">
                  {exampleCard.sourceReading}
                </div>
              ) : null}

              {exampleCard.sourceMeaning ? (
                <div className="mt-1 text-sm text-slate-700">
                  {exampleCard.sourceMeaning}
                </div>
              ) : null}
            </div>
          ) : null}

          <p className="mt-3 text-center text-xs text-slate-400">
            Next word comes automatically.
          </p>

          <div className="mt-3 flex justify-center">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onNext();
              }}
              className="rounded bg-gray-700 px-4 py-2 text-white"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}