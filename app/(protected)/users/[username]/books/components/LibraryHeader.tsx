import type { ReactNode } from "react";
import Link from "next/link";

type LibraryHeaderProps = {
  libraryOwnerLabel: string;
  children?: ReactNode;
};

export default function LibraryHeader({
  libraryOwnerLabel,
  children,
}: LibraryHeaderProps) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4 pr-6 sm:pr-10">
      <div>
        <div className="sm:hidden">
          <div className="text-2xl font-black text-slate-900">
            {libraryOwnerLabel} <Link href="/books" aria-label="My MEKURU Library" className="rounded focus-visible:outline focus-visible:outline-2">MEKURU</Link> Library
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Read, listen, and review.
          </p>
        </div>

        <div className="hidden items-center gap-3 sm:flex">
          <span className="text-2xl font-semibold sm:text-3xl">
            {libraryOwnerLabel}
          </span>

          <Link href="/books" aria-label="My MEKURU Library" className="rounded focus-visible:outline focus-visible:outline-2">
          <img
            src="/mekuru-logo.png"
            alt="Mekuru"
            className="h-12 w-12 object-contain sm:h-20 sm:w-20"
          />
          </Link>

          <span className="text-2xl font-semibold sm:text-3xl">
            Library
          </span>
        </div>

      </div>

      {children}
    </div>
  );
}
