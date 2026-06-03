import type { ReactNode } from "react";

type LibraryHeaderProps = {
  libraryOwnerLabel: string;
  libraryContextLabel: string | null;
  children?: ReactNode;
};

export default function LibraryHeader({
  libraryOwnerLabel,
  libraryContextLabel,
  children,
}: LibraryHeaderProps) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4 pr-6 sm:pr-10">
      <div>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-semibold sm:text-3xl">
            {libraryOwnerLabel}
          </span>

          <img
            src="/mekuru-logo.png"
            alt="Mekuru"
            className="h-12 w-12 object-contain sm:h-20 sm:w-20"
          />

          <span className="text-2xl font-semibold sm:text-3xl">
            Library
          </span>
        </div>

        {libraryContextLabel ? (
          <div className="mt-1 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
            {libraryContextLabel}
          </div>
        ) : null}
      </div>

      {children}
    </div>
  );
}