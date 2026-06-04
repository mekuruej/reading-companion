import type { ReactNode } from "react";

type CuriosityAddEditWordCardProps = {
  children: ReactNode;
};

export default function CuriosityAddEditWordCard({
  children,
}: CuriosityAddEditWordCardProps) {
  return (
    <div className="mt-4 rounded-2xl border border-stone-300 bg-white p-4">
      <div className="mb-3">
        <div className="text-sm font-semibold text-stone-900">
          Add / Edit Word
        </div>
        <p className="mt-1 text-sm text-stone-600">
          Search, adjust, and save from one place. Page and chapter stay ready
          for the next word.
        </p>
      </div>

      {children}
    </div>
  );
}