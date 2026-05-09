"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type ProfileShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  action?: {
    href: string;
    label: string;
  };
};

export default function ProfileShell({
  title,
  description,
  children,
  action,
}: ProfileShellProps) {
  const headerAction = action ?? {
    href: "/community/profile",
    label: "Back to Profile Home",
  };

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                Profile
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
                {title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
                {description}
              </p>
            </div>

            {headerAction ? (
              <Link
                href={headerAction.href}
                className="inline-flex items-center rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
              >
                {headerAction.label}
              </Link>
            ) : null}
          </div>
        </div>

        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
