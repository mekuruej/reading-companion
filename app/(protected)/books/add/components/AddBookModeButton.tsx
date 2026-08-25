type AddBookSearchMode = "title" | "isbn" | "asin";

type AddBookModeButtonProps = {
  mode: AddBookSearchMode;
  activeMode: AddBookSearchMode;
  children: string;
  onSelect: (mode: AddBookSearchMode) => void;
};

export default function AddBookModeButton({
  mode,
  activeMode,
  children,
  onSelect,
}: AddBookModeButtonProps) {
  const selected = mode === activeMode;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={() => onSelect(mode)}
      className={[
        "flex-1 rounded-2xl px-4 py-3 text-sm font-black transition",
        selected
          ? "bg-stone-900 text-white shadow-sm"
          : "bg-white text-stone-700 hover:bg-stone-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
