import type { ReactNode } from "react";

type AddWordFormShellProps = {
  editingSurface: string | null;
  children: ReactNode;
};

export default function AddWordFormShell({
  editingSurface,
  children,
}: AddWordFormShellProps) {
  return (
    <div
      className={`space-y-4 rounded-xl border p-4 ${
        editingSurface
          ? "border-amber-200 bg-amber-50"
          : "border-stone-200 bg-stone-50"
      }`}
    >
      {editingSurface ? (
        <div className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm font-medium text-amber-800">
          Editing "{editingSurface}"
        </div>
      ) : null}

      {children}
    </div>
  );
}