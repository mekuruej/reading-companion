// components/Header.tsx
// App header

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Header() {
  const [username, setUsername] = useState<string | null>(null);
  const [showLibraryMenu, setShowLibraryMenu] = useState(false);
  const [showDiscoveryMenu, setShowDiscoveryMenu] = useState(false);
  const [showStudyMenu, setShowStudyMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const pathname = usePathname();
  const libraryMenuRef = useRef<HTMLDivElement | null>(null);
  const discoveryMenuRef = useRef<HTMLDivElement | null>(null);
  const studyMenuRef = useRef<HTMLDivElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadHeaderData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (!user) {
          setUsername(null);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .maybeSingle();

        if (cancelled) return;

        if (profileError) throw profileError;
        setUsername(profile?.username ?? null);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load header data:", error);
          setUsername(null);
        }
      }
    }

    loadHeaderData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (libraryMenuRef.current && !libraryMenuRef.current.contains(target)) {
        setShowLibraryMenu(false);
      }

      if (discoveryMenuRef.current && !discoveryMenuRef.current.contains(target)) {
        setShowDiscoveryMenu(false);
      }

      if (studyMenuRef.current && !studyMenuRef.current.contains(target)) {
        setShowStudyMenu(false);
      }

      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setShowProfileMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const libraryHref = username ? `/users/${username}/books` : "/books";
  const librarySectionActive =
    pathname === libraryHref ||
    pathname === "/books" ||
    /^\/users\/[^/]+\/books$/.test(pathname) ||
    pathname === "/book-hubs" ||
    pathname === "/vocab";
  const discoverySectionActive =
    pathname === "/vocab/dictionary" || pathname.startsWith("/vocab/history");
  const studySectionActive =
    pathname === "/study-coming-soon" ||
    pathname === "/book-flashcards" ||
    pathname === "/book-kanji-readings";
  const profileSectionActive =
    pathname === "/profile" ||
    pathname.startsWith("/profile/") ||
    pathname === "/stats";

  return (
    <header className="sticky top-0 z-50 border-b border-stone-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div className="text-center md:text-left">
            <Link
              href={libraryHref}
              className="block text-m font-semibold tracking-tight text-stone-900 sm:text-2xl md:text-4xl"
            >
              MEKURU <span className="align-middle text-xs font-semibold text-red-600 md:text-sm">(Beta)</span>
            </Link>
            <div className="mt-0 text-xs text-stone-500">
              ページをめくって、話しまくろう！
            </div>
            <div className="mt-1 text-xs text-stone-500">
              Every word carries the memory of where you met it.
            </div>
          </div>

          <nav className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm md:mt-1 md:justify-end">
            <div className="relative" ref={libraryMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setShowLibraryMenu((prev) => !prev);
                  setShowDiscoveryMenu(false);
                  setShowStudyMenu(false);
                }}
                className={`rounded-full border px-3 py-1.5 transition ${librarySectionActive
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                  }`}
              >
                Library
              </button>

              {showLibraryMenu ? (
                <div className="absolute right-0 z-50 mt-2 min-w-[220px] rounded-2xl border border-stone-200 bg-white p-2 shadow-lg">
                  <Link
                    href={libraryHref}
                    className={`block rounded-xl px-3 py-2 text-sm transition ${pathname === libraryHref || pathname === "/books" || /^\/users\/[^/]+\/books$/.test(pathname)
                      ? "bg-stone-100 font-medium text-stone-900"
                      : "text-stone-700 hover:bg-stone-50"
                      }`}
                    onClick={() => setShowLibraryMenu(false)}
                  >
                    Library Home
                  </Link>

                  <Link
                    href="/book-hubs"
                    className={`block rounded-xl px-3 py-2 text-sm transition ${pathname === "/book-hubs"
                      ? "bg-stone-100 font-medium text-stone-900"
                      : "text-stone-700 hover:bg-stone-50"
                      }`}
                    onClick={() => setShowLibraryMenu(false)}
                  >
                    Book Hubs
                  </Link>

                  <Link
                    href="/vocab"
                    className={`block rounded-xl px-3 py-2 text-sm transition ${pathname === "/vocab"
                      ? "bg-stone-100 font-medium text-stone-900"
                      : "text-stone-700 hover:bg-stone-50"
                      }`}
                    onClick={() => setShowLibraryMenu(false)}
                  >
                    Vocab Lists
                  </Link>
                </div>
              ) : null}
            </div>

            <div className="relative" ref={discoveryMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setShowDiscoveryMenu((prev) => !prev);
                  setShowLibraryMenu(false);
                  setShowStudyMenu(false);
                }}
                className={`rounded-full border px-3 py-1.5 transition ${discoverySectionActive
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                  }`}
              >
                Discovery
              </button>

              {showDiscoveryMenu ? (
                <div className="absolute right-0 z-50 mt-2 min-w-[220px] rounded-2xl border border-stone-200 bg-white p-2 shadow-lg">
                  <Link
                    href="/vocab/dictionary"
                    className={`block rounded-xl px-3 py-2 text-sm transition ${pathname === "/vocab/dictionary"
                      ? "bg-stone-100 font-medium text-stone-900"
                      : "text-stone-700 hover:bg-stone-50"
                      }`}
                    onClick={() => setShowDiscoveryMenu(false)}
                  >
                    Dictionary
                  </Link>

                  <Link
                    href="/vocab/history"
                    className={`block rounded-xl px-3 py-2 text-sm transition ${pathname.startsWith("/vocab/history")
                      ? "bg-stone-100 font-medium text-stone-900"
                      : "text-stone-700 hover:bg-stone-50"
                      }`}
                    onClick={() => setShowDiscoveryMenu(false)}
                  >
                    Word History
                  </Link>
                </div>
              ) : null}
            </div>

            <div className="relative" ref={studyMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setShowStudyMenu((prev) => !prev);
                  setShowLibraryMenu(false);
                  setShowDiscoveryMenu(false);
                  setShowProfileMenu(false);
                }}
                className={`rounded-full border px-3 py-1.5 transition ${studySectionActive
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                  }`}
              >
                Study
              </button>

              {showStudyMenu ? (
                <div className="absolute right-0 z-50 mt-2 min-w-[240px] rounded-2xl border border-stone-200 bg-white p-2 shadow-lg">
                  <Link
                    href="/study-coming-soon"
                    className={`block rounded-xl px-3 py-2 text-sm transition ${pathname === "/study-coming-soon"
                      ? "bg-stone-100 font-medium text-stone-900"
                      : "text-stone-700 hover:bg-stone-50"
                      }`}
                    onClick={() => setShowStudyMenu(false)}
                  >
                    Library Study (Coming Soon)
                  </Link>

                  <Link
                    href="/book-flashcards"
                    className={`block rounded-xl px-3 py-2 text-sm transition ${pathname === "/book-flashcards"
                      ? "bg-stone-100 font-medium text-stone-900"
                      : "text-stone-700 hover:bg-stone-50"
                      }`}
                    onClick={() => setShowStudyMenu(false)}
                  >
                    Book Flashcards
                  </Link>

                  <Link
                    href="/book-kanji-readings"
                    className={`block rounded-xl px-3 py-2 text-sm transition ${pathname === "/book-kanji-readings"
                      ? "bg-stone-100 font-medium text-stone-900"
                      : "text-stone-700 hover:bg-stone-50"
                      }`}
                    onClick={() => setShowStudyMenu(false)}
                  >
                    Book Kanji Readings
                  </Link>
                </div>
              ) : null}
            </div>

            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setShowProfileMenu((prev) => !prev);
                  setShowLibraryMenu(false);
                  setShowDiscoveryMenu(false);
                  setShowStudyMenu(false);
                }}
                className={`rounded-full border px-3 py-1.5 transition ${profileSectionActive
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                  }`}
              >
                Profile
              </button>

              {showProfileMenu ? (
                <div className="absolute right-0 z-50 mt-2 min-w-[220px] rounded-2xl border border-stone-200 bg-white p-2 shadow-lg">
                  <Link
                    href="/profile"
                    className={`block rounded-xl px-3 py-2 text-sm transition ${pathname === "/profile"
                      ? "bg-stone-100 font-medium text-stone-900"
                      : "text-stone-700 hover:bg-stone-50"
                      }`}
                    onClick={() => setShowProfileMenu(false)}
                  >
                    Profile Home
                  </Link>

                  <Link
                    href="/stats"
                    className={`block rounded-xl px-3 py-2 text-sm transition ${pathname === "/stats"
                        ? "bg-stone-100 font-medium text-stone-900"
                        : "text-stone-700 hover:bg-stone-50"
                      }`}
                    onClick={() => setShowProfileMenu(false)}
                  >
                    Stats
                  </Link>

                  <Link
                    href="/profile/social"
                    className={`block rounded-xl px-3 py-2 text-sm transition ${pathname === "/profile/social"
                      ? "bg-stone-100 font-medium text-stone-900"
                      : "text-stone-700 hover:bg-stone-50"
                      }`}
                    onClick={() => setShowProfileMenu(false)}
                  >
                    Community
                  </Link>

                  <Link
                    href="/profile/book-clubs-coming-soon"
                    className={`block rounded-xl px-3 py-2 text-sm transition ${pathname === "/profile/book-clubs-coming-soon"
                      ? "bg-stone-100 font-medium text-stone-900"
                      : "text-stone-700 hover:bg-stone-50"
                      }`}
                    onClick={() => setShowProfileMenu(false)}
                  >
                    Book Clubs
                  </Link>
                </div>
              ) : null}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
