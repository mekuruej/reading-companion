import type { ReactNode } from "react";

type CuriosityRecentSessionWordsProps = {
  wordCount: number;
  children: ReactNode;
};

export default function CuriosityRecentSessionWords({
  wordCount,
  children,
}: CuriosityRecentSessionWordsProps) {
  if (wordCount === 0) return null;

  return (
    <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
      <div>
        <div className="text-sm font-medium text-stone-900">
          Recently added
        </div>
        <p className="mt-1 text-xs text-stone-500">
          {wordCount} word{wordCount === 1 ? "" : "s"} saved this session
        </p>
      </div>

      {children}
    </div>
  );
}