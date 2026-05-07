// components/Header.tsx
// App header

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Header() {
  const [username, setUsername] = useState<string | null>(null);
  const [profileRole, setProfileRole] = useState<string | null>(null);
  const [profileIsSuperTeacher, setProfileIsSuperTeacher] = useState(false);
  const [showLibraryMenu, setShowLibraryMenu] = useState(false);
  const [showDiscoveryMenu, setShowDiscoveryMenu] = useState(false);
  const [showStudyMenu, setShowStudyMenu] = useState(false);
  const [showTeacherMenu, setShowTeacherMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const pathname = usePathname();
  const libraryMenuRef = useRef<HTMLDivElement | null>(null);
  const discoveryMenuRef = useRef<HTMLDivElement | null>(null);
  const studyMenuRef = useRef<HTMLDivElement | null>(null);
  const teacherMenuRef = useRef<HTMLDivElement | null>(null);
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
          setProfileRole(null);
          setProfileIsSuperTeacher(false);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("username, role, is_super_teacher")
          .eq("id", user.id)
          .maybeSingle();

        if (cancelled) return;

        if (profileError) throw profileError;
        setUsername(profile?.username ?? null);
        setProfileRole(profile?.role ?? null);
        setProfileIsSuperTeacher(!!profile?.is_super_teacher);

      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load header data:", error);
          setUsername(null);
          setProfileRole(null);
          setProfileIsSuperTeacher(false);
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

      if (teacherMenuRef.current && !teacherMenuRef.current.contains(target)) {
        setShowTeacherMenu(false);
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
    pathname.startsWith("/library") ||
    pathname === libraryHref ||
    pathname === "/books" ||
    /^\/users\/[^/]+\/books$/.test(pathname) ||
    pathname === "/vocab";
  const discoverySectionActive = pathname.startsWith("/discovery");
  const studySectionActive =
    pathname.startsWith("/library-study") ||
    pathname.startsWith("/kanji-reading-study");
  const profileSectionActive = pathname.startsWith("/community");
  const teacherSectionActive = pathname.startsWith("/teacher");
  const showTeacherLink =
    profileRole === "teacher" || profileRole === "super_teacher" || profileIsSuperTeacher;
  const showSuperTeacherLinks = profileRole === "super_teacher" || profileIsSuperTeacher;

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
              <Link
                href="/library"
                className={`rounded-full border px-3 py-1.5 transition md:hidden ${librarySectionActive
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                  }`}
                onClick={() => {
                  setShowLibraryMenu(false);
                  setShowDiscoveryMenu(false);
                  setShowStudyMenu(false);
                  setShowProfileMenu(false);
                }}
              >
                Library
              </Link>

              <button
                type="button"
                onClick={() => {
                  setShowLibraryMenu((prev) => !prev);
                  setShowDiscoveryMenu(false);
                  setShowStudyMenu(false);
                  setShowProfileMenu(false);
                }}
                className={`hidden rounded-full border px-3 py-1.5 transition md:inline-flex ${librarySectionActive
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                  }`}
              >
                Library
              </button>

              {showLibraryMenu ? (
                <div className="absolute right-0 z-50 mt-2 hidden min-w-[220px] rounded-2xl border border-stone-200 bg-white p-2 shadow-lg md:block">
                  <Link
                    href="/library"
                    className={`block rounded-xl px-3 py-2 text-sm leading-tight transition ${pathname === "/library"
                      ? "bg-stone-100 font-medium text-stone-900"
                      : "text-stone-700 hover:bg-stone-50"
                      }`}
                    onClick={() => setShowLibraryMenu(false)}
                  >
                    Library Hub
                  </Link>

                  <Link
                    href={libraryHref}
                    className={`block rounded-xl px-3 py-2 text-sm leading-tight transition ${pathname === libraryHref || pathname === "/books" || /^\/users\/[^/]+\/books$/.test(pathname)
                      ? "bg-stone-100 font-medium text-stone-900"
                      : "text-stone-700 hover:bg-stone-50"
                      }`}
                    onClick={() => setShowLibraryMenu(false)}
                  >
                    Library Home
                  </Link>

                  <Link
                    href="/library/book-hubs"
                    className={`block rounded-xl px-3 py-2 text-sm leading-tight transition ${pathname === "/library/book-hubs"
                      ? "bg-stone-100 font-medium text-stone-900"
                      : "text-stone-700 hover:bg-stone-50"
                      }`}
                    onClick={() => setShowLibraryMenu(false)}
                  >
                    Book Hubs
                  </Link>

                  <Link
                    href="/vocab"
                    className={`block rounded-xl px-3 py-2 text-sm leading-tight transition ${pathname === "/vocab"
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
              <Link
                href="/discovery"
                className={`rounded-full border px-3 py-1.5 transition md:hidden ${discoverySectionActive
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                  }`}
                onClick={() => {
                  setShowDiscoveryMenu(false);
                  setShowLibraryMenu(false);
                  setShowStudyMenu(false);
                  setShowProfileMenu(false);
                }}
              >
                Discovery
              </Link>

              <button
                type="button"
                onClick={() => {
                  setShowDiscoveryMenu((prev) => !prev);
                  setShowLibraryMenu(false);
                  setShowStudyMenu(false);
                  setShowProfileMenu(false);
                }}
                className={`hidden rounded-full border px-3 py-1.5 transition md:inline-flex ${discoverySectionActive
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                  }`}
              >
                Discovery
              </button>

              {showDiscoveryMenu ? (
                <div className="absolute right-0 z-50 mt-2 hidden min-w-[220px] rounded-2xl border border-stone-200 bg-white p-2 shadow-lg md:block">
                  <Link
                    href="/discovery"
                    className={`block rounded-xl px-3 py-2 text-sm leading-tight transition ${pathname === "/discovery"
                      ? "bg-stone-100 font-medium text-stone-900"
                      : "text-stone-700 hover:bg-stone-50"
                      }`}
                    onClick={() => setShowDiscoveryMenu(false)}
                  >
                    Discovery Hub
                  </Link>

                  <Link
                    href="/discovery/dictionary"
                    className={`block rounded-xl px-3 py-2 text-sm leading-tight transition ${pathname === "/discovery/dictionary"
                      ? "bg-stone-100 font-medium text-stone-900"
                      : "text-stone-700 hover:bg-stone-50"
                      }`}
                    onClick={() => setShowDiscoveryMenu(false)}
                  >
                    Dictionary
                  </Link>

                  <Link
                    href="/discovery/word-history"
                    className={`block rounded-xl px-3 py-2 text-sm leading-tight transition ${pathname.startsWith("/discovery/word-history")
                      ? "bg-stone-100 font-medium text-stone-900"
                      : "text-stone-700 hover:bg-stone-50"
                      }`}
                    onClick={() => setShowDiscoveryMenu(false)}
                  >
                    Word History
                  </Link>

                  <Link
                    href="/discovery/reader-insights"
                    className={`block rounded-xl px-3 py-2 text-sm leading-tight transition ${pathname === "/discovery/reader-insights"
                      ? "bg-stone-100 font-medium text-stone-900"
                      : "text-stone-700 hover:bg-stone-50"
                      }`}
                    onClick={() => setShowDiscoveryMenu(false)}
                  >
                    Reader Insights
                  </Link>
                </div>
              ) : null}
            </div>

            <div className="relative" ref={studyMenuRef}>
              <Link
                href="/library-study"
                className={`rounded-full border px-3 py-1.5 transition md:hidden ${studySectionActive
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                  }`}
                onClick={() => {
                  setShowStudyMenu(false);
                  setShowLibraryMenu(false);
                  setShowDiscoveryMenu(false);
                  setShowProfileMenu(false);
                }}
              >
                Study
              </Link>

              <button
                type="button"
                onClick={() => {
                  setShowStudyMenu((prev) => !prev);
                  setShowLibraryMenu(false);
                  setShowDiscoveryMenu(false);
                  setShowProfileMenu(false);
                }}
                className={`hidden rounded-full border px-3 py-1.5 transition md:inline-flex ${studySectionActive
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                  }`}
              >
                Study
              </button>

              {showStudyMenu ? (
                <div className="absolute right-0 z-50 mt-2 hidden min-w-[240px] rounded-2xl border border-stone-200 bg-white p-2 shadow-lg md:block">
                  <Link
                    href="/library-study"
                    className={`block rounded-xl px-3 py-2 text-sm leading-tight transition ${pathname === "/library-study"
                      ? "bg-stone-100 font-medium text-stone-900"
                      : "text-stone-700 hover:bg-stone-50"
                      }`}
                    onClick={() => setShowStudyMenu(false)}
                  >
                    Study Hub
                  </Link>
                  <Link
                    href="/library-study/check"
                    className={`block rounded-xl px-3 py-2 text-sm leading-tight transition ${pathname === "/library-study/check"
                      ? "bg-stone-100 font-medium text-stone-900"
                      : "text-stone-700 hover:bg-stone-50"
                      }`}
                    onClick={() => setShowStudyMenu(false)}
                  >
                    Ability Check
                  </Link>

                  <Link
                    href="/library-study/practice"
                    className={`block rounded-xl px-3 py-2 text-sm leading-tight transition ${pathname === "/library-study/practice"
                      ? "bg-stone-100 font-medium text-stone-900"
                      : "text-stone-700 hover:bg-stone-50"
                      }`}
                    onClick={() => setShowStudyMenu(false)}
                  >
                    Library Review
                  </Link>

                  <Link
                    href="/library-study/book-flashcards"
                    className={`block rounded-xl px-3 py-2 text-sm leading-tight transition ${pathname === "/library-study/book-flashcards"
                      ? "bg-stone-100 font-medium text-stone-900"
                      : "text-stone-700 hover:bg-stone-50"
                      }`}
                    onClick={() => setShowStudyMenu(false)}
                  >
                    Book Flashcards
                  </Link>
                  <Link
                    href="/library-study/kanji"
                    className={`block rounded-xl px-3 py-2 text-sm leading-tight transition ${pathname === "/library-study/kanji"
                      ? "bg-stone-100 font-medium text-stone-900"
                      : "text-stone-700 hover:bg-stone-50"
                      }`}
                    onClick={() => setShowStudyMenu(false)}
                  >
                    Kanji Reading Study
                  </Link>
                  <Link
                    href="/library-study/word-sky"
                    className={`block rounded-xl px-3 py-2 text-sm leading-tight transition ${pathname === "/library-study/word-sky"
                      ? "bg-stone-100 font-medium text-stone-900"
                      : "text-stone-700 hover:bg-stone-50"
                      }`}
                    onClick={() => setShowStudyMenu(false)}
                  >
                    Word Sky
                  </Link>
                </div>
              ) : null}
            </div>

            {showTeacherLink ? (
              <div className="relative" ref={teacherMenuRef}>
                <Link
                  href="/teacher"
                  className={`rounded-full border px-3 py-1.5 transition md:hidden ${teacherSectionActive
                    ? "border-stone-900 bg-stone-900 text-white"
                    : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                    }`}
                  onClick={() => {
                    setShowLibraryMenu(false);
                    setShowDiscoveryMenu(false);
                    setShowStudyMenu(false);
                    setShowTeacherMenu(false);
                    setShowProfileMenu(false);
                  }}
                >
                  Teacher
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setShowTeacherMenu((prev) => !prev);
                    setShowLibraryMenu(false);
                    setShowDiscoveryMenu(false);
                    setShowStudyMenu(false);
                    setShowProfileMenu(false);
                  }}
                  className={`hidden rounded-full border px-3 py-1.5 transition md:inline-flex ${teacherSectionActive
                    ? "border-stone-900 bg-stone-900 text-white"
                    : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                    }`}
                >
                  Teacher
                </button>

                {showTeacherMenu ? (
                  <div className="absolute right-0 z-50 mt-2 hidden min-w-[240px] rounded-2xl border border-stone-200 bg-white p-2 shadow-lg md:block">
                    <Link
                      href="/teacher"
                      className={`block rounded-xl px-3 py-2 text-sm leading-tight transition ${pathname === "/teacher"
                        ? "bg-stone-100 font-medium text-stone-900"
                        : "text-stone-700 hover:bg-stone-50"
                        }`}
                      onClick={() => setShowTeacherMenu(false)}
                    >
                      Teacher Hub
                    </Link>

                    <Link
                      href="/teacher/students"
                      className={`block rounded-xl px-3 py-2 text-sm leading-tight transition ${pathname === "/teacher/students"
                        ? "bg-stone-100 font-medium text-stone-900"
                        : "text-stone-700 hover:bg-stone-50"
                        }`}
                      onClick={() => setShowTeacherMenu(false)}
                    >
                      My Students
                    </Link>

                    <Link
                      href="/teacher/reading-fit"
                      className={`block rounded-xl px-3 py-2 text-sm leading-tight transition ${pathname === "/teacher/reading-fit"
                        ? "bg-stone-100 font-medium text-stone-900"
                        : "text-stone-700 hover:bg-stone-50"
                        }`}
                      onClick={() => setShowTeacherMenu(false)}
                    >
                      Reading Fit Queue
                    </Link>

                    {showSuperTeacherLinks ? (
                      <Link
                        href="/teacher/books"
                        className={`block rounded-xl px-3 py-2 text-sm leading-tight transition ${pathname === "/teacher/books"
                          ? "bg-stone-100 font-medium text-stone-900"
                          : "text-stone-700 hover:bg-stone-50"
                          }`}
                        onClick={() => setShowTeacherMenu(false)}
                      >
                        Book Flags
                      </Link>
                    ) : null}

                    <Link
                      href="/teacher/kanji"
                      className={`block rounded-xl px-3 py-2 text-sm leading-tight transition ${pathname === "/teacher/kanji"
                        ? "bg-stone-100 font-medium text-stone-900"
                        : "text-stone-700 hover:bg-stone-50"
                        }`}
                      onClick={() => setShowTeacherMenu(false)}
                    >
                      Kanji Queue
                    </Link>

                    <Link
                      href="/teacher/words"
                      className={`block rounded-xl px-3 py-2 text-sm leading-tight transition ${pathname === "/teacher/words"
                        ? "bg-stone-100 font-medium text-stone-900"
                        : "text-stone-700 hover:bg-stone-50"
                        }`}
                      onClick={() => setShowTeacherMenu(false)}
                    >
                      Word Flags
                    </Link>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="relative" ref={profileMenuRef}>
              <Link
                href="/community"
                className={`rounded-full border px-3 py-1.5 transition md:hidden ${profileSectionActive
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                  }`}
                onClick={() => {
                  setShowProfileMenu(false);
                  setShowLibraryMenu(false);
                  setShowDiscoveryMenu(false);
                  setShowStudyMenu(false);
                }}
              >
                Community
              </Link>

              <button
                type="button"
                onClick={() => {
                  setShowProfileMenu((prev) => !prev);
                  setShowLibraryMenu(false);
                  setShowDiscoveryMenu(false);
                  setShowStudyMenu(false);
                }}
                className={`hidden rounded-full border px-3 py-1.5 transition md:inline-flex ${profileSectionActive
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                  }`}
              >
                Community
              </button>

              {showProfileMenu ? (
                <div className="absolute right-0 z-50 mt-2 hidden min-w-[220px] rounded-2xl border border-stone-200 bg-white p-2 shadow-lg md:block">
                  <Link
                    href="/community"
                    className={`block rounded-xl px-3 py-2 text-sm leading-tight transition ${pathname === "/community"
                      ? "bg-stone-100 font-medium text-stone-900"
                      : "text-stone-700 hover:bg-stone-50"
                      }`}
                    onClick={() => setShowProfileMenu(false)}
                  >
                    Community Hub
                  </Link>

                  <Link
                    href="/community/profile"
                    className={`block rounded-xl px-3 py-2 text-sm leading-tight transition ${pathname === "/community/profile" || pathname.startsWith("/community/profile/")
                      ? "bg-stone-100 font-medium text-stone-900"
                      : "text-stone-700 hover:bg-stone-50"
                      }`}
                    onClick={() => setShowProfileMenu(false)}
                  >
                    My Profile
                  </Link>

                  <Link
                    href="/community/stats"
                    className={`block rounded-xl px-3 py-2 text-sm leading-tight transition ${pathname === "/community/stats"
                      ? "bg-stone-100 font-medium text-stone-900"
                      : "text-stone-700 hover:bg-stone-50"
                      }`}
                    onClick={() => setShowProfileMenu(false)}
                  >
                    My Stats
                  </Link>
                  <Link
                    href="/community/book-clubs"
                    className={`block rounded-xl px-3 py-2 text-sm leading-tight transition ${pathname === "/community/book-clubs"
                      ? "bg-stone-100 font-medium text-stone-900"
                      : "text-stone-700 hover:bg-stone-50"
                      }`}
                    onClick={() => setShowProfileMenu(false)}
                  >
                    Book Clubs
                  </Link>
                  <Link
                    href="/discovery/reader-insights"
                    className={`block rounded-xl px-3 py-2 text-sm leading-tight transition ${pathname === "/discovery/reader-insights"
                      ? "bg-stone-100 font-medium text-stone-900"
                      : "text-stone-700 hover:bg-stone-50"
                      }`}
                    onClick={() => setShowProfileMenu(false)}
                  >
                    Reader Insights
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
