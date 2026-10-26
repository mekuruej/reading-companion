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
    <div className={libraryOwnerLabel === "My"
      ? "mb-5 flex items-center justify-between gap-3 sm:gap-4 sm:pr-10"
      : "mb-5 flex items-center justify-between gap-4 pr-6 sm:pr-10"}>
      {libraryOwnerLabel === "My" ? (
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/books"
            aria-label="My MEKURU Library"
            className="shrink-0 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <img
              src="/mekuru-logo.png"
              alt=""
              aria-hidden="true"
              className="h-11 w-11 object-contain sm:h-14 sm:w-14"
            />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-black leading-tight tracking-tight text-[var(--appearance-text)] sm:text-2xl md:text-3xl">
              Welcome to MEKURU
            </h1>
            <p className="mt-0.5 text-sm font-medium leading-5 text-[var(--appearance-muted-text)] sm:text-base">
              Your Reading Companion
            </p>
          </div>
        </div>
      ) : (
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
      )}

      {libraryOwnerLabel === "My" ? (
        <div className="shrink-0 whitespace-nowrap">{children}</div>
      ) : children}
    </div>
  );
}
