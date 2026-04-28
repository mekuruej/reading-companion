// Support Project Footer Gate
//

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function shouldHideSupportFooter(pathname: string) {
  return pathname === "/book-hubs" || pathname.startsWith("/books/");
}

export default function SupportProjectFooterGate() {
  const pathname = usePathname();

  if (shouldHideSupportFooter(pathname)) {
    return null;
  }

  return (
    <footer className="border-t border-stone-200 bg-stone-50">
      <div className="mx-auto flex max-w-6xl justify-center px-6 py-6">
        <Link
          href="https://ko-fi.com/japanesemekuru"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
        >
          Support this project
        </Link>
      </div>
    </footer>
  );
}
