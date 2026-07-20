import type { ReactNode } from "react";

type BookHubTab = "bookInfo" | "reading" | "story" | "reflection";

type BookHubTabItem = {
  id: BookHubTab;
  label: string;
};

type BookHubTabBarProps = {
  activeTab: BookHubTab;
  tabs?: BookHubTabItem[];
  onTabChange: (tab: BookHubTab) => void;
};

const DEFAULT_BOOK_HUB_TABS: BookHubTabItem[] = [
  { id: "reflection", label: "Reading Reflection" },
  { id: "reading", label: "Reading Sessions" },
  { id: "story", label: "Story Notes" },
  { id: "bookInfo", label: "Book Info" },
];

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
  tabs = DEFAULT_BOOK_HUB_TABS,
  onTabChange,
}: BookHubTabBarProps) {
  return (
    <div className="mt-2">
      <div className="mb-4 w-full border-b border-stone-400 px-2">
        <div className="flex flex-wrap items-end gap-3">
          {tabs.map((tab) => (
            <FilingTab
              key={tab.id}
              active={activeTab === tab.id}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </FilingTab>
          ))}
        </div>
      </div>
    </div>
  );
}
