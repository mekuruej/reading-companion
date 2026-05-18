// Support Project Footer Gate
//

"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

function shouldShowSupportFooter(pathname: string) {
  const supportFooterPrefixes = [
    "/login",
    "/dashboard",
    "/users",
    "/vocab",
    "/library-study",
    "/teacher",
    "/kanji-reading-study",
    "/community/stats",
    "/stats",
  ];

  return supportFooterPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export default function SupportProjectFooterGate() {
  const pathname = usePathname();

  if (!shouldShowSupportFooter(pathname)) {
    return null;
  }

  return (
    <footer className="relative mt-12 border-t border-slate-200 bg-white/70 px-6 py-6 text-sm text-slate-500">
      <Link
        href="/credits"
        className="mb-4 block text-left text-xs font-medium text-slate-400 underline underline-offset-2 transition hover:text-slate-600 sm:absolute sm:left-6 sm:top-1/2 sm:mb-0 sm:-translate-y-1/2"
      >
        Credits
      </Link>

      <div className="text-center">
        <p className="mb-3">
          Support Mekuru
          <br />
          Help this small reading project grow.
        </p>

        <a
          href="https://ko-fi.com/japanesemekuru"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-md"
        >
          Support app development
        </a>
      </div>
    </footer>
  );
}