// components/Header.tsx
// App header

"use client";

import TeacherAttentionBadge from "@/components/TeacherAttentionBadge";
import { useTeacherAttention } from "@/lib/teacher/useTeacherAttention";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { getAppAccessStatus, isMissingAppAccessColumnError } from "@/lib/access/appAccess";
import { getFeatureAccess } from "@/lib/access/featureAccess";
import { loadJapaneseLearningFreeFeatureFlags } from "@/lib/access/japaneseLearningFreeFeatures";
import { shouldShowJapaneseStudyNavigation } from "@/lib/access/japaneseLearningIntent";
import { supabase } from "@/lib/supabaseClient";

function navClass(active: boolean) {
  return `inline-flex min-h-10 items-center justify-center gap-1 border-b-2 bg-transparent px-2 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-600 focus-visible:ring-offset-2 ${active ? "border-stone-800 text-stone-950" : "border-transparent text-stone-600 hover:text-stone-950"}`;
}

export default function Header() {
  const [username, setUsername] = useState<string | null>(null);
  const [profileRole, setProfileRole] = useState<string | null>(null);
  const [profileIsSuperTeacher, setProfileIsSuperTeacher] = useState(false);
  const [showJapaneseStudyNavigation, setShowJapaneseStudyNavigation] = useState(false);
  const [hasFullAccess, setHasFullAccess] = useState(false);
  const [isTrialAccess, setIsTrialAccess] = useState(false);
  const [canUseFindNextBook, setCanUseFindNextBook] = useState(false);
  const [pendingJapaneseLearningRequestCount, setPendingJapaneseLearningRequestCount] = useState(0);
  const [headerRefreshToken, setHeaderRefreshToken] = useState(0);
  const [showLibraryMenu, setShowLibraryMenu] = useState(false);
  const [showStudyMenu, setShowStudyMenu] = useState(false);
  const [showTeacherMenu, setShowTeacherMenu] = useState(false);
  const pathname = usePathname();
  const attention = useTeacherAttention(profileRole === "teacher" || profileRole === "super_teacher" || profileIsSuperTeacher);
  const libraryMenuRef = useRef<HTMLDivElement | null>(null);
  const studyMenuRef = useRef<HTMLDivElement | null>(null);
  const teacherMenuRef = useRef<HTMLDivElement | null>(null);

  const libraryButtonRef = useRef<HTMLButtonElement | null>(null);
  const studyButtonRef = useRef<HTMLButtonElement | null>(null);
  const teacherButtonRef = useRef<HTMLButtonElement | null>(null);

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
          setShowJapaneseStudyNavigation(false);
          setHasFullAccess(false);
          setIsTrialAccess(false);
          setCanUseFindNextBook(false);
          setPendingJapaneseLearningRequestCount(0);
          return;
        }

        const profileResult = await supabase
          .from("profiles")
          .select("username, role, is_super_teacher, target_language, japanese_learning_enabled, app_access_type, app_access_expires_at, trial_started_at")
          .eq("id", user.id)
          .maybeSingle();
        let profile: any = profileResult.data;
        let profileError = profileResult.error;

        if (isMissingAppAccessColumnError(profileError)) {
          const fallbackResult = await supabase
            .from("profiles")
            .select("username, role, is_super_teacher, target_language, japanese_learning_enabled")
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
          setShowJapaneseStudyNavigation(false);
          setHasFullAccess(false);
          setIsTrialAccess(false);
          setCanUseFindNextBook(false);
          setPendingJapaneseLearningRequestCount(0);
          return;
        }

        setUsername(profile?.username ?? null);
        setProfileRole(profile?.role ?? null);
        setProfileIsSuperTeacher(profile?.is_super_teacher === true || profile?.is_super_teacher === "true");
        setShowJapaneseStudyNavigation(shouldShowJapaneseStudyNavigation(profile));
        const accessStatus = profile ? getAppAccessStatus(profile) : null;
        setHasFullAccess(accessStatus?.hasFullAccess ?? false);
        setIsTrialAccess(accessStatus?.reason === "trial");
        const freeFeatureFlags = await loadJapaneseLearningFreeFeatureFlags(supabase);
        if (cancelled) return;
        const featureAccess = getFeatureAccess({
          role:
            profile?.is_super_teacher === true || profile?.is_super_teacher === "true"
              ? "super_teacher"
              : profile?.role ?? null,
          hasFullAccess: accessStatus?.hasFullAccess ?? false,
          isTrialActive: accessStatus?.reason === "trial",
          freeFeatures: freeFeatureFlags,
        });
        setCanUseFindNextBook(featureAccess.canUseFindNextBook);

        const canReviewJapaneseLearningRequests =
          profile?.role === "super_teacher" ||
          profile?.role === "admin" ||
          profile?.is_super_teacher === true ||
          profile?.is_super_teacher === "true";

        if (canReviewJapaneseLearningRequests) {
          const pendingRequestsResult = await supabase
            .from("japanese_learning_access_requests")
            .select("id", { count: "exact", head: true })
            .eq("status", "pending");

          if (cancelled) return;

          setPendingJapaneseLearningRequestCount(
            !pendingRequestsResult.error ? pendingRequestsResult.count ?? 0 : 0
          );
        } else {
          setPendingJapaneseLearningRequestCount(0);
        }

      } catch (error) {
        if (!cancelled) {
          setUsername(null);
          setProfileRole(null);
          setProfileIsSuperTeacher(false);
          setShowJapaneseStudyNavigation(false);
          setHasFullAccess(false);
          setIsTrialAccess(false);
          setCanUseFindNextBook(false);
          setPendingJapaneseLearningRequestCount(0);
        }
      }
    }

    loadHeaderData();

    return () => {
      cancelled = true;
    };
  }, [headerRefreshToken]);

  useEffect(() => {
    function handleProfilePreferencesUpdated() {
      setHeaderRefreshToken((current) => current + 1);
    }

    window.addEventListener(
      "mekuru-profile-preferences-updated",
      handleProfilePreferencesUpdated
    );

    return () => {
      window.removeEventListener(
        "mekuru-profile-preferences-updated",
        handleProfilePreferencesUpdated
      );
    };
  }, []);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (libraryMenuRef.current && !libraryMenuRef.current.contains(target)) setShowLibraryMenu(false);
      if (studyMenuRef.current && !studyMenuRef.current.contains(target)) setShowStudyMenu(false);
      if (teacherMenuRef.current && !teacherMenuRef.current.contains(target)) setShowTeacherMenu(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (showLibraryMenu) { setShowLibraryMenu(false); libraryButtonRef.current?.focus(); }
      if (showStudyMenu) { setShowStudyMenu(false); studyButtonRef.current?.focus(); }
      if (showTeacherMenu) { setShowTeacherMenu(false); teacherButtonRef.current?.focus(); }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showLibraryMenu, showStudyMenu, showTeacherMenu]);

  const libraryHref = username ? `/users/${username}/books` : "/books";
  const librarySectionActive =
    pathname === "/library" ||
    pathname.startsWith("/library/") ||
    pathname === libraryHref ||
    pathname === "/books" ||
    pathname === "/books/add" ||
    /^\/users\/[^/]+\/books$/.test(pathname) ||
    pathname === "/vocab";
  const dictionaryActive = pathname === "/discovery/dictionary";
  const studySectionActive =
    pathname.startsWith("/library-study") ||
    pathname.startsWith("/kanji-reading-study") ||
    pathname === "/discovery/find-books";
  const teacherSectionActive = pathname.startsWith("/teacher");
  const teacherStudentsActive = pathname === "/teacher/students" || pathname.startsWith("/teacher/students/");
  const showTeacherLink =
    profileRole === "teacher" ||
    profileRole === "super_teacher" ||
    profileRole === "admin" ||
    profileIsSuperTeacher;

  const showFullAccessNavigation = (hasFullAccess && !isTrialAccess) || showTeacherLink;
  const canUseLearningStudy = hasFullAccess || showTeacherLink;
  const canUseAdvancedStudyNavigation = showFullAccessNavigation;
  const myLibraryHref = username
    ? `/users/${encodeURIComponent(username)}/books`
    : "/books";

  function closeMenus() {
    setShowLibraryMenu(false);
    setShowStudyMenu(false);
    setShowTeacherMenu(false);
  }

  return (
    <header data-mekuru-header className="relative z-30 text-stone-900">
      <div className="w-full border-b border-stone-100 bg-white">
        <div className="mx-auto flex min-h-[68px] max-w-6xl items-center px-4 py-2">
          <Link href={myLibraryHref} aria-label="My MEKURU Library" onClick={closeMenus}
            className="block whitespace-nowrap text-[1.75rem] font-extrabold tracking-tight text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 sm:text-[2.125rem]">
            MEKURU <span className="align-middle text-[10px] font-semibold text-red-600 sm:text-xs">(Beta)</span>
          </Link>
        </div>
      </div>
      <div className="w-full border-b border-stone-200 bg-stone-50">
        <nav aria-label="Main navigation" className="relative mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-1 px-4 py-2.5">
          <div className="static inline-flex items-center sm:relative" ref={libraryMenuRef} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setShowLibraryMenu(false); }}>
            <Link href={myLibraryHref} aria-current={librarySectionActive ? "page" : undefined} onClick={closeMenus} className={navClass(librarySectionActive)}>
              My Library
            </Link>
            <button
              ref={libraryButtonRef}
              type="button"
              aria-label="More Library destinations"
              aria-expanded={showLibraryMenu}
              aria-haspopup="true"
              aria-controls="mekuru-library-menu"
              onClick={() => {
                setShowLibraryMenu((open) => !open);
                setShowStudyMenu(false);
                setShowTeacherMenu(false);
              }}
              className={`${navClass(librarySectionActive)} px-1`}
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" className={`h-3 w-3 transition-transform ${showLibraryMenu ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="m5.5 7.5 4.5 4 4.5-4" />
              </svg>
            </button>
            {showLibraryMenu ? (
              <div id="mekuru-library-menu" className="absolute left-4 right-4 top-full z-50 mt-2 sm:left-0 sm:right-auto sm:w-60 rounded-2xl border border-stone-200 bg-white p-2 shadow-xl">
                <Link href="/library" onClick={closeMenus} className="block rounded-xl px-3 py-2.5 text-sm text-stone-700 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500">Library Home</Link>
                <Link href="/books/add" onClick={closeMenus} className="block rounded-xl px-3 py-2.5 text-sm text-stone-700 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500">Add a Book</Link>
                <Link href="/library/book-hubs" onClick={closeMenus} className="block rounded-xl px-3 py-2.5 text-sm text-stone-700 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500">Book Hubs</Link>
                <Link href="/community/profile" onClick={closeMenus} className="block rounded-xl px-3 py-2.5 text-sm text-stone-700 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500">My Reading Profile</Link>
                <Link href="/reading-access" onClick={closeMenus} className="block rounded-xl px-3 py-2.5 text-sm text-stone-700 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500">Subscription &amp; Access</Link>
                <Link href="/vocab" onClick={closeMenus} className="block rounded-xl px-3 py-2.5 text-sm text-stone-700 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500">Vocab Lists</Link>
              </div>
            ) : null}
          </div>

          {showJapaneseStudyNavigation ? (
            <div className="static inline-flex items-center sm:relative" ref={studyMenuRef} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setShowStudyMenu(false); }}>
              <Link href="/library-study" aria-current={studySectionActive ? "page" : undefined} onClick={closeMenus} className={navClass(studySectionActive)}>
                Study
              </Link>
              <button
                ref={studyButtonRef}
                type="button"
                aria-label="More Study destinations"
                aria-expanded={showStudyMenu}
                aria-haspopup="true"
                aria-controls="mekuru-study-menu"
                onClick={() => {
                  setShowStudyMenu((open) => !open);
                  setShowLibraryMenu(false);
                  setShowTeacherMenu(false);
                }}
                className={`${navClass(studySectionActive)} px-1`}
              >
                <svg aria-hidden="true" viewBox="0 0 20 20" className={`h-3 w-3 transition-transform ${showStudyMenu ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5.5 7.5 4.5 4 4.5-4" />
                </svg>
              </button>
              {showStudyMenu ? (
                <div id="mekuru-study-menu" className="absolute left-4 right-4 top-full z-50 mt-2 sm:left-0 sm:right-auto sm:w-64 rounded-2xl border border-stone-200 bg-white p-2 shadow-xl">
                  <Link href="/library-study" onClick={closeMenus} className="block rounded-xl px-3 py-2.5 text-sm text-stone-700 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500">Study Home</Link>
                  <Link href="/library-study/characters" onClick={closeMenus} className="block rounded-xl px-3 py-2.5 text-sm text-stone-700 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500">Foundation Sets</Link>
                  {canUseLearningStudy ? (
                    <Link href="/library-study/book-study" onClick={closeMenus} className="block rounded-xl px-3 py-2.5 text-sm text-stone-700 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500">Book Study</Link>
                  ) : (
                    <div className="cursor-default rounded-xl px-3 py-2.5 text-sm text-stone-400">Book Study 🔒<span className="block text-xs text-stone-500">Japanese Learning 🔒</span></div>
                  )}
                  {canUseAdvancedStudyNavigation ? (
                    <Link href="/library-study/advanced" onClick={closeMenus} className="block rounded-xl px-3 py-2.5 text-sm text-stone-700 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500">Advanced Study</Link>
                  ) : (
                    <div className="cursor-default rounded-xl px-3 py-2.5 text-sm text-stone-400">{isTrialAccess ? "Advanced Study forming" : "Advanced Study 🔒"}<span className="block text-xs text-stone-500">Japanese Learning 🔒</span></div>
                  )}
                  {canUseFindNextBook ? (
                    <Link href="/discovery/find-books" onClick={closeMenus} className="block rounded-xl px-3 py-2.5 text-sm text-stone-700 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500">Find Your Next Book</Link>
                  ) : (
                    <div className="cursor-default rounded-xl px-3 py-2.5 text-sm text-stone-400">Find Your Next Book 🔒<span className="block text-xs text-stone-500">Japanese Learning 🔒</span></div>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}

          {canUseLearningStudy ? (
            <div className="inline-flex items-center gap-1">
              <Link href="/discovery/dictionary" aria-current={dictionaryActive ? "page" : undefined} onClick={closeMenus} className={navClass(dictionaryActive)}>
                Dictionary
              </Link>
              <a
                href="/discovery/dictionary"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open Dictionary in a new tab"
                title="Open Dictionary in a new tab"
                className="inline-flex h-8 w-7 items-center justify-center rounded-md text-stone-500 hover:bg-black/5 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500"
              >
                <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 3h6v6M17 3l-8 8" />
                  <path d="M15 11v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
                </svg>
              </a>
            </div>
          ) : null}

          {showTeacherLink ? (
            <div className="static sm:relative" ref={teacherMenuRef} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setShowTeacherMenu(false); }}>
              <button
                ref={teacherButtonRef}
                type="button"
                aria-expanded={showTeacherMenu}
                aria-haspopup="true"
                aria-controls="mekuru-teaching-menu"
                onClick={() => {
                  const opening = !showTeacherMenu;
                  setShowTeacherMenu(opening);
                  setShowLibraryMenu(false);
                  setShowStudyMenu(false);
                  if (opening) setHeaderRefreshToken((current) => current + 1);
                }}
                className={navClass(teacherSectionActive)}
              >
                Teaching
                <svg aria-hidden="true" viewBox="0 0 20 20" className={`ml-1 h-3 w-3 transition-transform ${showTeacherMenu ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5.5 7.5 4.5 4 4.5-4" />
                </svg>
              </button>
              {showTeacherMenu ? (
                <div id="mekuru-teaching-menu" className="absolute left-4 right-4 top-full z-50 mt-2 sm:w-64 rounded-2xl border border-stone-200 bg-white p-2 shadow-xl sm:left-auto sm:right-0">
                  <Link href="/teacher" onClick={closeMenus} className="block rounded-xl px-3 py-2.5 text-sm text-stone-700 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500">Teacher Hub</Link>
                  {(profileRole === "teacher" || profileRole === "super_teacher" || profileIsSuperTeacher) ? (
                    <Link href="/teacher/students" onClick={closeMenus} className="block rounded-xl px-3 py-2.5 text-sm text-stone-700 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500">
                      {profileRole === "super_teacher" || profileIsSuperTeacher ? "Users" : "Students"}<TeacherAttentionBadge count={attention.total} />
                    </Link>
                  ) : null}
                  {getFeatureAccess({ role: profileRole, isSuperTeacher: profileIsSuperTeacher }).isAdmin ? (
                    <Link href="/teacher/japanese-learning-requests" onClick={closeMenus} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm text-stone-700 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500">
                      <span>Japanese Learning Requests</span>
                      {pendingJapaneseLearningRequestCount > 0 ? <span aria-label={`${pendingJapaneseLearningRequestCount} pending requests`} className="inline-flex min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-bold text-amber-900">{pendingJapaneseLearningRequestCount}</span> : null}
                    </Link>
                  ) : null}
                  {getFeatureAccess({ role: profileRole, isSuperTeacher: profileIsSuperTeacher }).isAdmin ? <Link href="/teacher/admin" onClick={closeMenus} className="block rounded-xl px-3 py-2.5 text-sm text-stone-700 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500">Admin Hub</Link> : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
