type WarmupWord = {
  surface: string;
  reading: string;
};

type DashboardWarmupPanelProps = {
  words: WarmupWord[];
  claimedKeys: Set<string>;
  getKey: (word: WarmupWord) => string;
  onToggleWord: (word: WarmupWord) => void;
};

const positions = [
  ["18%", "12%"],
  ["58%", "25%"],
  ["30%", "52%"],
  ["66%", "70%"],
];

export default function DashboardWarmupPanel({
  words,
  claimedKeys,
  getKey,
  onToggleWord,
}: DashboardWarmupPanelProps) {
  return (
    <>
      <div className="relative mt-4 h-44 overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-indigo-50">
        {words.map((word, index) => {
          const key = getKey(word);
          const claimed = claimedKeys.has(key);
          const [top, left] = positions[index] ?? ["40%", "40%"];

          return (
            <button
              key={key}
              type="button"
              onClick={() => onToggleWord(word)}
              className={[
                "absolute rounded-full border px-4 py-2 text-base font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
                claimed
                  ? "border-emerald-200 bg-emerald-100 text-emerald-900"
                  : "border-white bg-white/90 text-slate-800",
              ].join(" ")}
              style={{
                top,
                left,
                animation: `dashboard-word-bob ${
                  9 + index
                }s ease-in-out ${index * -1.7}s infinite`,
              }}
            >
              {word.surface}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        Tapped words move to your Reading Gate in Ability Check. Find more words
        in Word Sky later.
      </p>
    </>
  );
}