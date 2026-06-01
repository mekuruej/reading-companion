import type { ReactNode } from "react";

type BookHubTab = "bookInfo" | "study" | "reading" | "story" | "reflection";

type BookHubTabBarProps = {
  activeTab: BookHubTab;
  onTabChange: (tab: BookHubTab) => void;
};

function FilingTab({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "relative -mb-px rounded-t-2xl border px-5 py-3 text-base font-semibold transition-all",
        active
          ? "z-10 border-stone-600 border-b-white bg-stone-700 text-white shadow-sm"
          : "border-stone-300 bg-stone-200 text-stone-700 hover:bg-stone-300",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function BookHubTabBar({
  activeTab,
  onTabChange,
}: BookHubTabBarProps) {
  return (
    <div className="mt-2">
      <div className="mb-4 w-full border-b border-stone-400 px-2">
        <div className="flex flex-wrap items-end gap-3">
          <FilingTab
            active={activeTab === "reflection"}
            onClick={() => onTabChange("reflection")}
          >
            Reading Reflection
          </FilingTab>

          <FilingTab
            active={activeTab === "study"}
            onClick={() => onTabChange("study")}
          >
            Vocab Tools
          </FilingTab>

          <FilingTab
            active={activeTab === "reading"}
            onClick={() => onTabChange("reading")}
          >
            Reading Sessions
          </FilingTab>

          <FilingTab
            active={activeTab === "story"}
            onClick={() => onTabChange("story")}
          >
            Story Notes
          </FilingTab>

          <FilingTab
            active={activeTab === "bookInfo"}
            onClick={() => onTabChange("bookInfo")}
          >
            Book Info
          </FilingTab>
        </div>
      </div>
    </div>
  );
}