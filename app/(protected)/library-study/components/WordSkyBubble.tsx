type WordSkyBubbleWord = {
  skyId: string;
  surface: string;
  lane: number;
  duration: number;
  delay: number;
  bobDuration: number;
  bobDelay: number;
};

type WordSkyBubbleProps = {
  word: WordSkyBubbleWord;
  bubbleClassName: string;
  isSelected: boolean;
  onClick: () => void;
};

export default function WordSkyBubble({
  word,
  bubbleClassName,
  isSelected,
  onClick,
}: WordSkyBubbleProps) {
  return (
    <button
      key={word.skyId}
      type="button"
      onClick={onClick}
      className={[
        "absolute rounded-full border-0 bg-transparent p-0 text-left shadow-none transition",
        isSelected ? "ring-2 ring-slate-700" : "",
      ].join(" ")}
      style={{
        left: "-18%",
        top: `${word.lane}%`,
        animation: `word-sky-cross ${word.duration}s linear ${word.delay}s infinite`,
      }}
    >
      <span
        className={`block rounded-full border px-4 py-3 shadow-sm backdrop-blur transition hover:shadow-md ${bubbleClassName}`}
        style={{
          animation: `word-sky-bob ${word.bobDuration}s ease-in-out ${word.bobDelay}s infinite`,
        }}
      >
        <span className="block text-lg font-semibold leading-none">
          {word.surface}
        </span>
      </span>
    </button>
  );
}