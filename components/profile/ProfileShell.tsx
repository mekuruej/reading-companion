"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

const PROFILE_NAV = [
  { href: "/profile", label: "Profile Home" },
  { href: "/stats-coming-soon", label: "Stats" },
  { href: "/profile/social", label: "Community" },
  { href: "/reading-groups", label: "Book Clubs" },
] as const;

export default function ProfileShell({
  title,
  description,
  children,
  action,
}: ProfileShellProps) {
  const pathname = usePathname();

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

            {action ? (
              <Link
                href={action.href}
                className="inline-flex items-center rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
              >
                {action.label}
              </Link>
            ) : null}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {PROFILE_NAV.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                    isActive
                      ? "border-stone-900 bg-stone-900 text-white"
                      : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
