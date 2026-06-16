type SupportMode = "full" | "reading" | "meaning";

type ReadAlongSupportModeTabsProps = {
  supportMode: SupportMode;
  onSupportModeChange: (mode: SupportMode) => void;
};

const supportModes: {
  value: SupportMode;
  mobileLabel: string;
  desktopLabel: string;
}[] = [
  { value: "full", mobileLabel: "Full", desktopLabel: "Full Support" },
  { value: "reading", mobileLabel: "Reading", desktopLabel: "Reading Support" },
  { value: "meaning", mobileLabel: "Meaning", desktopLabel: "Meaning Support" },
];

// Support mode selector for the Read Along word cards.
// page.tsx still owns the supportMode state and decides how each word displays;
// this component only renders the three mode buttons.
export default function ReadAlongSupportModeTabs({
  supportMode,
  onSupportModeChange,
}: ReadAlongSupportModeTabsProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {supportModes.map((mode) => {
        const isActive = supportMode === mode.value;

        return (
          <button
            key={mode.value}
            type="button"
            onClick={() => onSupportModeChange(mode.value)}
            className={`rounded-xl px-2 py-2 text-xs whitespace-nowrap sm:text-sm ${
              isActive
                ? "bg-stone-900 text-white"
                : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
            }`}
          >
            <span className="sm:hidden">{mode.mobileLabel}</span>
            <span className="hidden sm:inline">{mode.desktopLabel}</span>
          </button>
        );
      })}
    </div>
  );
}