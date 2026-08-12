// components/Header.tsx
// App header

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { getAppAccessStatus, isMissingAppAccessColumnError } from "@/lib/access/appAccess";
import { supabase } from "@/lib/supabaseClient";

export default function Header() {
  const [username, setUsername] = useState<string | null>(null);
  const [profileRole, setProfileRole] = useState<string | null>(null);
  const [profileIsSuperTeacher, setProfileIsSuperTeacher] = useState(false);
  const [hasFullAccess, setHasFullAccess] = useState(false);
  const [isTrialAccess, setIsTrialAccess] = useState(false);
  const [hasSavedVocabulary, setHasSavedVocabulary] = useState(false);
  const [hideJapaneseTaglineForEnglishBook, setHideJapaneseTaglineForEnglishBook] = useState(false);
  const [showLibraryMenu, setShowLibraryMenu] = useState(false);
  const [showDiscoveryMenu, setShowDiscoveryMenu] = useState(false);
  const [showStudyMenu, setShowStudyMenu] = useState(false);
  const [showTeacherMenu, setShowTeacherMenu] = useState(false);
  const pathname = usePathname();
  const libraryMenuRef = useRef<HTMLDivElement | null>(null);
  const discoveryMenuRef = useRef<HTMLDivElement | null>(null);
  const studyMenuRef = useRef<HTMLDivElement | null>(null);
  const teacherMenuRef = useRef<HTMLDivElement | null>(null);

  function userBookIdFromPath(path: string | null) {
    if (!path) return null;

    const bookMatch = path.match(/^\/books\/([^/]+)/);
    if (bookMatch?.[1]) return bookMatch[1];

    const teacherStudentBookMatch = path.match(/^\/teacher\/students\/[^/]+\/books\/([^/]+)/);
    if (teacherStudentBookMatch?.[1]) return teacherStudentBookMatch[1];

    return null;
  }

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
          setHasFullAccess(false);
          setIsTrialAccess(false);
          setHasSavedVocabulary(false);
          return;
        }

        const profileResult = await supabase
          .from("profiles")
          .select("username, role, is_super_teacher, app_access_type, app_access_expires_at, trial_started_at")
          .eq("id", user.id)
          .maybeSingle();
        let profile: any = profileResult.data;
        let profileError = profileResult.error;

        if (isMissingAppAccessColumnError(profileError)) {
          const fallbackResult = await supabase
            .from("profiles")
            .select("username, role, is_super_teacher")
            .eq("id", user.id)
            .maybeSingle();

          profile = fallbackResult.data;
          profileError = fallbackResult.error;
        }

        if (cancelled) return;

        if (profileError) {
          setUsername(null);
          setProfileRole(null);
          setProfileIsSuperTeacher(false);
          setHasFullAccess(false);
          setIsTrialAccess(false);
          setHasSavedVocabulary(false);
          return;
        }

        setUsername(profile?.username ?? null);
        setProfileRole(profile?.role ?? null);
        setProfileIsSuperTeacher(!!profile?.is_super_teacher);
        const accessStatus = profile ? getAppAccessStatus(profile) : null;
        setHasFullAccess(accessStatus?.hasFullAccess ?? false);
        setIsTrialAccess(accessStatus?.reason === "trial");

        const savedWordsResult = await supabase
          .from("user_book_words")
          .select("id", { count: "exact", head: true });

        if (cancelled) return;

        setHasSavedVocabulary(
          !savedWordsResult.error && (savedWordsResult.count ?? 0) > 0
        );

      } catch (error) {
        if (!cancelled) {
          setUsername(null);
          setProfileRole(null);
          setProfileIsSuperTeacher(false);
          setHasFullAccess(false);
          setIsTrialAccess(false);
          setHasSavedVocabulary(false);
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

    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentBookLanguage() {
      const userBookId = userBookIdFromPath(pathname);

      if (!userBookId) {
        setHideJapaneseTaglineForEnglishBook(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_books")
        .select("books:book_id(language_code)")
        .eq("id", userBookId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setHideJapaneseTaglineForEnglishBook(false);
        return;
      }

      const book = Array.isArray((data as any)?.books)
        ? (data as any).books[0]
        : (data as any)?.books;

      setHideJapaneseTaglineForEnglishBook(book?.language_code === "en");
    }

    void loadCurrentBookLanguage();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const libraryHref = username ? `/users/${username}/books` : "/books";
  const librarySectionActive =
    pathname === "/library" ||
    pathname.startsWith("/library/") ||
    pathname === libraryHref ||
    pathname === "/books" ||
    pathname === "/books/add" ||
    /^\/users\/[^/]+\/books$/.test(pathname) ||
    pathname === "/vocab";
  const discoverySectionActive = pathname.startsWith("/discovery");
  const studySectionActive =
    pathname.startsWith("/library-study") ||
    pathname.startsWith("/kanji-reading-study");
  const teacherSectionActive = pathname.startsWith("/teacher");
  const teacherStudentsActive = pathname === "/teacher/students" || pathname.startsWith("/teacher/students/");
  const teacherLessonPrepActive =
    pathname === "/teacher/lesson-prep" ||
    pathname.startsWith("/teacher/library") ||
    pathname.startsWith("/teacher/clubs");
  const teacherNeedsAttentionActive =
    pathname === "/teacher/needs-attention" ||
    pathname === "/teacher/books" ||
    pathname === "/teacher/words" ||
    pathname === "/teacher/kanji" ||
    pathname === "/teacher/ratings" ||
    pathname === "/teacher/reading-fit";
  const teacherSiteUpkeepActive =
    pathname === "/teacher/general-upkeep" ||
    pathname === "/teacher/books/add" ||
    pathname === "/teacher/global-words" ||
    pathname.startsWith("/teacher/testing");
  const showTeacherLink =
    profileRole === "teacher" || profileRole === "super_teacher" || profileIsSuperTeacher;

  const showFullAccessNavigation = (hasFullAccess && !isTrialAccess) || showTeacherLink;
  const canUseLearningStudy = hasFullAccess || showTeacherLink;
  const canUseAdvancedStudyNavigation = showFullAccessNavigation;
  const isFreeReaderNavigation = !hasFullAccess && !isTrialAccess && !showTeacherLink;
  const showVocabularyLibraryLink = !isFreeReaderNavigation || hasSavedVocabulary;
  const vocabularyLibraryLabel = isFreeReaderNavigation
    ? "Vocabulary Archive"
    : "Vocabulary Lists";

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
            {!hideJapaneseTaglineForEnglishBook ? (
              <div className="mt-0 text-xs text-stone-500">
                ページをめくって、話しまくろう！
              </div>
            ) : null}
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
                    href={libraryHref}
                    className={`block rounded-xl px-3 py-2 text-sm leading-tight transition ${pathname === libraryHref || pathname === "/books" || /^\/users\/[^/]+\/books$/.test(pathname)
                      ? "bg-stone-100 font-medium text-stone-900"
                      : "text-stone-700 hover:bg-stone-50"
                      }`}
                    onClick={() => setShowLibraryMenu(false)}
                  >
                    My Mekuru Library
                  </Link>

                  <Link
                    href="/books/add"
                    className={`block rounded-xl px-3 py-2 text-sm leading-tight transition ${pathname === "/books/add"
                      ? "bg-stone-100 font-medium text-stone-900"
                      : "text-stone-700 hover:bg-stone-50"
                      }`}
                    onClick={() => setShowLibraryMenu(false)}
                  >
                    Add a Book
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

                  {showVocabularyLibraryLink ? (
                    <Link
                      href="/library/vocab-list-index"
                      className={`block rounded-xl px-3 py-2 text-sm leading-tight transition ${pathname === "/library/vocab-list-index"
                        ? "bg-stone-100 font-medium text-stone-900"
                        : "text-stone-700 hover:bg-stone-50"
                        }`}
                      onClick={() => setShowLibraryMenu(false)}
                    >
                      {vocabularyLibraryLabel}
                    </Link>
                  ) : null}

                  <Link
                    href="/community/profile"
                    className={`block rounded-xl px-3 py-2 text-sm leading-tight transition ${pathname === "/community/profile" ||
                      pathname.startsWith("/community/profile/")
                      ? "bg-stone-100 font-medium text-stone-900"
                      : "text-stone-700 hover:bg-stone-50"
                      }`}
                    onClick={() => setShowLibraryMenu(false)}
                  >
                    My Reading Profile
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
                }}
                className={`hidden rounded-full border px-3 py-1.5 transition md:inline-flex ${studySectionActive
                  ? "border-stone-900 bg-stone-900 text-white"
                  : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                  }`}
              >
                Study
              </button>

              {showStudyMenu ? (
                <div className="absolute right-0 z-50 mt-2 hidden min-w-[220px] rounded-2xl border border-stone-200 bg-white p-2 shadow-lg md:block">
                  <Link
                    href="/library-study"
                    className={`block rounded-xl px-3 py-2 text-sm leading-tight transition ${pathname === "/library-study"
                      ? "bg-stone-100 font-medium text-stone-900"
                      : "text-stone-700 hover:bg-stone-50"
                      }`}
                    onClick={() => setShowStudyMenu(false)}
                  >
                    Study Home
                  </Link>

                  <Link
                    href="/library-study/characters"
                    className={`block rounded-xl px-3 py-2 text-sm leading-tight transition ${pathname === "/library-study/characters" ||
                      pathname === "/library-study/kana" ||
                      pathname === "/library-study/kanji" ||
                      pathname === "/library-study/foundation-vocabulary"
                      ? "bg-stone-100 font-medium text-stone-900"
                      : "text-stone-700 hover:bg-stone-50"
                      }`}
                    onClick={() => setShowStudyMenu(false)}
                  >
                    Foundation Sets
                  </Link>

                  {canUseLearningStudy ? (
                    <Link
                      href="/library-study/book-study"
                      className={`block rounded-xl px-3 py-2 text-sm leading-tight transition ${pathname === "/library-study/book-study" ||
                        pathname === "/library-study/book-flashcards"
                        ? "bg-stone-100 font-medium text-stone-900"
                        : "text-stone-700 hover:bg-stone-50"
                        }`}
                      onClick={() => setShowStudyMenu(false)}
                    >
                      Book Study
                    </Link>
                  ) : (
                    <div className="block cursor-default rounded-xl px-3 py-2 text-sm leading-tight text-stone-400">
                      Book Study 🔒
                      <span className="block text-xs text-stone-500">
                        Reading Access
                      </span>
                    </div>
                  )}

                  {canUseAdvancedStudyNavigation ? (
                    <Link
                      href="/library-study/advanced"
                      className={`block rounded-xl px-3 py-2 text-sm leading-tight transition ${pathname === "/library-study/advanced" ||
                        pathname === "/library-study/check" ||
                        pathname === "/library-study/practice" ||
                        pathname === "/library-study/word-sky"
                        ? "bg-stone-100 font-medium text-stone-900"
                        : "text-stone-700 hover:bg-stone-50"
                        }`}
                      onClick={() => setShowStudyMenu(false)}
                    >
                      Advanced Study
                    </Link>
                  ) : (
                    <div className="block cursor-default rounded-xl px-3 py-2 text-sm leading-tight text-stone-400">
                      {isTrialAccess ? "Advanced Study forming" : "Advanced Study 🔒"}
                      <span className="block text-xs text-stone-500">
                        {isTrialAccess ? "Paid Reading Access" : "Reading Access"}
                      </span>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {showFullAccessNavigation ? (
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
                      href="/discovery/find-books"
                      className={`block rounded-xl px-3 py-2 text-sm leading-tight transition ${pathname === "/discovery/find-books"
                        ? "bg-stone-100 font-medium text-stone-900"
                        : "text-stone-700 hover:bg-stone-50"
                        }`}
                      onClick={() => setShowDiscoveryMenu(false)}
                    >
                      Find Your Next Book
                    </Link>

                    <Link
                      href="/discovery/dictionary"
                      className={`block rounded-xl px-3 py-2 text-sm leading-tight transition ${pathname === "/discovery/dictionary"
                        ? "bg-stone-100 font-medium text-stone-900"
                        : "text-stone-700 hover:bg-stone-50"
                        }`}
                      onClick={() => setShowDiscoveryMenu(false)}
                    >
                      Dictionary/Word History
                    </Link>

                    <Link
                      href="/community/stats"
                      className={`block rounded-xl px-3 py-2 text-sm leading-tight transition ${pathname === "/community/stats" || pathname.startsWith("/community/stats/")
                        ? "bg-stone-100 font-medium text-stone-900"
                        : "text-stone-700 hover:bg-stone-50"
                        }`}
                      onClick={() => setShowDiscoveryMenu(false)}
                    >
                      Stats
                    </Link>

                  </div>
                ) : null}
              </div>
            ) : null}

            {showTeacherLink ? (
              <div
                className="relative order-last flex basis-full justify-center md:order-none md:block md:basis-auto"
                ref={teacherMenuRef}
              >
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
                  }}
                >
                  Teacher Hub
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setShowTeacherMenu((prev) => !prev);
                    setShowLibraryMenu(false);
                    setShowDiscoveryMenu(false);
                    setShowStudyMenu(false);
                  }}
                  className={`hidden rounded-full border px-3 py-1.5 transition md:inline-flex ${teacherSectionActive
                    ? "border-stone-900 bg-stone-900 text-white"
                    : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                    }`}
                >
                  Teacher Hub
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
                      className={`block rounded-xl px-3 py-2 text-sm leading-tight transition ${teacherStudentsActive
                        ? "bg-stone-100 font-medium text-stone-900"
                        : "text-stone-700 hover:bg-stone-50"
                        }`}
                      onClick={() => setShowTeacherMenu(false)}
                    >
                      Students
                    </Link>

                    <Link
                      href="/teacher/lesson-prep"
                      className={`block rounded-xl px-3 py-2 text-sm leading-tight transition ${teacherLessonPrepActive
                        ? "bg-stone-100 font-medium text-stone-900"
                        : "text-stone-700 hover:bg-stone-50"
                        }`}
                      onClick={() => setShowTeacherMenu(false)}
                    >
                      Lesson Prep
                    </Link>

                    <Link
                      href="/teacher/needs-attention"
                      className={`block rounded-xl px-3 py-2 text-sm leading-tight transition ${teacherNeedsAttentionActive
                        ? "bg-stone-100 font-medium text-stone-900"
                        : "text-stone-700 hover:bg-stone-50"
                        }`}
                      onClick={() => setShowTeacherMenu(false)}
                    >
                      Needs Attention
                    </Link>

                    <Link
                      href="/teacher/general-upkeep"
                      className={`block rounded-xl px-3 py-2 text-sm leading-tight transition ${teacherSiteUpkeepActive
                        ? "bg-stone-100 font-medium text-stone-900"
                        : "text-stone-700 hover:bg-stone-50"
                        }`}
                      onClick={() => setShowTeacherMenu(false)}
                    >
                      Site Upkeep
                    </Link>
                  </div>
                ) : null}
              </div>
            ) : null}
          </nav>
        </div>
      </div>
    </header>
  );
}
