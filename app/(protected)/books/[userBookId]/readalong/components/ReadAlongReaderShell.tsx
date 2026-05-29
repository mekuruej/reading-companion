import type { ReactNode, Ref } from "react";

type ReadAlongReaderShellProps = {
  header: ReactNode;
  scrollAreaRef: Ref<HTMLDivElement>;
  children: ReactNode;
};

// Layout shell for the Read Along reader.
// page.tsx still owns page navigation, scroll behavior, word mapping,
// fade state, and tap-to-progress behavior.
export default function ReadAlongReaderShell({
  header,
  scrollAreaRef,
  children,
}: ReadAlongReaderShellProps) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-sm">
      <div className="sticky top-0 z-10 border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="space-y-3">{header}</div>
      </div>

      <div
        ref={scrollAreaRef}
        className="max-h-[72vh] overflow-y-auto px-4 py-4 sm:px-6"
      >
        {children}
      </div>
    </div>
  );
}