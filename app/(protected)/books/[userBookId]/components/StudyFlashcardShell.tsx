import type { ReactNode } from "react";

type StudyFlashcardShellProps = {
  isClickable: boolean;
  onReveal: () => void;
  children: ReactNode;
};

export default function StudyFlashcardShell({
  isClickable,
  onReveal,
  children,
}: StudyFlashcardShellProps) {
  return (
    <div
      onClick={isClickable ? onReveal : undefined}
      className="
        relative
        flex
        min-h-72 w-[90vw] max-w-xl
        cursor-pointer select-none
        items-center justify-center
        rounded-2xl border border-slate-500
        bg-white p-8 text-center
        shadow-2xl
      "
    >
      {children}
    </div>
  );
}
