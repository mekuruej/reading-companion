type KanjiAnswerStyle = "multipleChoice" | "typing";

type KanjiAnswerStyleSelectorProps = {
  value: KanjiAnswerStyle;
  onChange: (value: KanjiAnswerStyle) => void;
};

export default function KanjiAnswerStyleSelector({
  value,
  onChange,
}: KanjiAnswerStyleSelectorProps) {
  return (
    <div className="mt-3 flex items-center justify-center gap-2 text-sm">
      <span className="font-medium text-slate-600">Answer:</span>

      <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => onChange("multipleChoice")}
          className={`rounded-full px-3 py-1.5 text-xs font-black transition ${
            value === "multipleChoice"
              ? "bg-slate-950 text-white"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          Multiple Choice
        </button>

        <button
          type="button"
          onClick={() => onChange("typing")}
          className={`rounded-full px-3 py-1.5 text-xs font-black transition ${
            value === "typing"
              ? "bg-slate-950 text-white"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          Typing
        </button>
      </div>
    </div>
  );
}
