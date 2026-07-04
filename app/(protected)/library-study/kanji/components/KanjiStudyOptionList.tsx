type KanjiStudyOptionState = "idle" | "correct" | "wrong" | "neutral";

type KanjiStudyOptionItem = {
  value: string;
  state: KanjiStudyOptionState;
  largeText?: boolean;
  compactText?: boolean;
};

type KanjiStudyOptionListProps = {
  options: KanjiStudyOptionItem[];
  disabled: boolean;
  onChoose: (value: string) => void;
};

function optionClassName(state: KanjiStudyOptionState, largeText: boolean, compactText: boolean) {
  const textSize = compactText ? "text-base sm:text-lg text-left" : largeText ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl";
  const base = `w-full rounded border px-4 py-3 ${textSize} `;

  if (state === "idle") return `${base}bg-white hover:bg-gray-50`;
  if (state === "correct") return `${base}border-green-400 bg-green-100`;
  if (state === "wrong") return `${base}border-red-400 bg-red-100`;

  return `${base}bg-white`;
}

export default function KanjiStudyOptionList({
  options,
  disabled,
  onChoose,
}: KanjiStudyOptionListProps) {
  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      {options.length < 2 ? (
        <div className="text-sm text-amber-700">
          Not enough answer choices for this card. Skip to the next one.
        </div>
      ) : (
        options.map((option, index) => (
          <button
            key={`${option.value}-${index}`}
            type="button"
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              onChoose(option.value);
            }}
            className={optionClassName(option.state, !!option.largeText, !!option.compactText)}
          >
            <span className="mr-2 align-middle text-sm text-gray-500">
              {index + 1}.
            </span>
            {option.value}
          </button>
        ))
      )}
    </div>
  );
}
