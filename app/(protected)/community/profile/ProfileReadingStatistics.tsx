// Existing Production statistics and access presentation, retained for Unified Profile.
//

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadAllPagedRows } from "@/lib/vocabulary/loadAllPagedRows";
import { getAppAccessStatus } from "@/lib/access/appAccess";
import { getFeatureAccess } from "@/lib/access/featureAccess";
import { wantsJapaneseLearning } from "@/lib/access/japaneseLearningIntent";
import { bookTypeLabel } from "@/lib/books/bookTypes";
import { supabase } from "@/lib/supabaseClient";

export type ProfileRow = {
  display_name: string | null;
  username: string | null;
  native_language: string | null;
  target_language: string | null;
  japanese_learning_enabled: boolean | null;
  level: string | null;
  role: string | null;
  is_super_teacher: boolean | null;
  app_access_type: string | null;
  app_access_expires_at: string | null;
};

type SessionRow = {
  user_book_id: string | null;
  start_page: number | null;
  end_page: number | null;
  minutes_read: number | null;
  session_mode: string | null;
  is_filler?: boolean | null;
  user_books?: {
    books?: {
      book_type: string | null;
      language_code: string | null;
    } | null;
  } | null;
};

type PaceByBookType = {
  bookType: string;
  label: string;
  curiosityMinPerPage: number | null;
  curiosityPages: number;
  fluidMinPerPage: number | null;
  fluidPages: number;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatCount(value: number | null | undefined) {
  if (value == null) return "—";
  return value.toLocaleString();
}

function formatMinutes(total: number | null | undefined) {
  if (total == null) return "—";
  if (total <= 0) return "0m";

  const hours = Math.floor(total / 60);
  const minutes = total % 60;

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function formatMinPerPage(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(1)} min/page`;
}

export function sessionPages(row: SessionRow) {
  if (row.start_page == null || row.end_page == null) return 0;
  const start = Number(row.start_page);
  const end = Number(row.end_page);

  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  if (end <= start) return 0;

  return end - start;
}

function isJapanesePaceBook(row: SessionRow) {
  const languageCode = row.user_books?.books?.language_code?.trim().toLowerCase();
  return !languageCode || languageCode === "ja";
}

export function buildPaceByBookType(sessions: SessionRow[]) {
  const buckets = new Map<
    string,
    {
      curiosityMinutes: number;
      curiosityPages: number;
      fluidMinutes: number;
      fluidPages: number;
    }
  >();

  for (const row of sessions) {
    if (row.session_mode !== "curiosity" && row.session_mode !== "fluid") continue;
    if (!isJapanesePaceBook(row)) continue;

    const pages = sessionPages(row);
    const minutes = row.minutes_read ?? 0;
    if (pages <= 0 || minutes <= 0) continue;

    const bookType = row.user_books?.books?.book_type ?? "other";
    const bucket =
      buckets.get(bookType) ??
      {
        curiosityMinutes: 0,
        curiosityPages: 0,
        fluidMinutes: 0,
        fluidPages: 0,
      };

    if (row.session_mode === "curiosity") {
      bucket.curiosityMinutes += minutes;
      bucket.curiosityPages += pages;
    } else {
      bucket.fluidMinutes += minutes;
      bucket.fluidPages += pages;
    }

    buckets.set(bookType, bucket);
  }

  return Array.from(buckets.entries())
    .map(([bookType, bucket]) => ({
      bookType,
      label: bookTypeLabel(bookType, "Other"),
      curiosityMinPerPage:
        bucket.curiosityPages > 0
          ? bucket.curiosityMinutes / bucket.curiosityPages
          : null,
      curiosityPages: bucket.curiosityPages,
      fluidMinPerPage:
        bucket.fluidPages > 0 ? bucket.fluidMinutes / bucket.fluidPages : null,
      fluidPages: bucket.fluidPages,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function AccessLabel({
  profile,
}: {
  profile: ProfileRow | null;
}) {
  const appAccessStatus = profile ? getAppAccessStatus(profile) : null;
  const trialEndsAt = profile?.app_access_expires_at ?? null;
  const wantsJapaneseStudyTools = wantsJapaneseLearning(profile);

  if (!appAccessStatus) {
    return (
      <p className="mt-2 text-sm leading-6 text-stone-600">
        Sign in again to refresh your current access details.
      </p>
    );
  }

  const role = profile?.role ?? "";
  const isTeacher =
    role === "teacher" ||
    role === "super_teacher" ||
    role === "admin" ||
    profile?.is_super_teacher === true;
  const roleStatus = profile?.is_super_teacher
    ? "Super Teacher"
    : isTeacher
    ? "Teacher"
    : "Reader";
  const accessStatus = appAccessStatus.isTrialActive
    ? trialEndsAt
      ? `Trial · until ${formatDate(trialEndsAt)}`
      : "Trial"
    : appAccessStatus.reason === "free"
      ? "Free"
      : appAccessStatus.reason === "expired"
        ? "Expired"
        : appAccessStatus.reason === "none" || appAccessStatus.reason === "inactive"
          ? "No Access"
          : appAccessStatus.hasFullAccess
            ? "Full Access"
            : "Free";
  const japaneseLearningStatus = appAccessStatus.isTrialActive
    ? trialEndsAt
      ? `Trial Active · until ${formatDate(trialEndsAt)}`
      : "Trial Active"
    : appAccessStatus.hasFullAccess
      ? "Active"
      : "Not Active";
  const headline = isTeacher
    ? "Teacher account"
    : appAccessStatus.isTrialActive
        ? "Reading Companion trial active"
        : appAccessStatus.hasFullAccess
          ? "Reading Companion active"
          : "Free Reading Companion";
  const description = appAccessStatus.isTrialActive
    ? appAccessStatus.daysRemaining === 1
      ? "1 day remaining."
      : `${appAccessStatus.daysRemaining ?? 0} days remaining.`
    : appAccessStatus.hasFullAccess
      ? "Japanese Learning entitlement is active."
      : "Your universal reading tools stay available for accessible books.";

  return (
    <>
      <h2 className="mt-2 text-2xl font-black text-stone-950">
        {headline}
      </h2>
      <p className="mt-2 text-sm leading-6 text-stone-600">
        {description}
      </p>
      <div className="mt-4 space-y-2">
        <AccessStatusRow label="Status" value={roleStatus} />
        <AccessStatusRow label="Access" value={accessStatus} />
        <AccessStatusRow
          label="Japanese Study Tools"
          value={wantsJapaneseStudyTools ? "On" : "Off"}
        />
        <AccessStatusRow label="Japanese Learning" value={japaneseLearningStatus} />
      </div>
    </>
  );
}

function AccessStatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/80 px-3 py-2">
      <span className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">
        {label}
      </span>
      <span className="rounded-full bg-stone-950 px-3 py-1 text-xs font-black text-white">
        {value}
      </span>
    </div>
  );
}

function HighlightCard({
  label,
  value,
  detail,
  tone = "stone",
}: {
  label: string;
  value: string | number | null | undefined;
  detail?: string | null;
  tone?: "amber" | "emerald" | "sky" | "violet" | "stone";
}) {
  const toneClass =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-950"
      : tone === "emerald"
        ? "border-emerald-200 bg-emerald-50 text-emerald-950"
        : tone === "sky"
          ? "border-sky-200 bg-sky-50 text-sky-950"
          : tone === "violet"
            ? "border-violet-200 bg-violet-50 text-violet-950"
            : "border-stone-200 bg-white text-stone-950";

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${toneClass}`}>
      <p className="text-xs font-black uppercase tracking-[0.18em] opacity-60">{label}</p>
      <p className="mt-2 text-2xl font-black leading-tight">{value ?? "—"}</p>
      {detail ? <p className="mt-2 text-sm font-semibold leading-6 opacity-75">{detail}</p> : null}
    </div>
  );
}

function PaceAverageCard({
  label,
  value,
  bookTypeLabel,
  pages,
  tone,
}: {
  label: string;
  value: string;
  bookTypeLabel: string;
  pages: number;
  tone: "amber" | "emerald" | "sky" | "violet";
}) {
  return (
    <HighlightCard
      label={label}
      value={value}
      detail={`Japanese books only · ${bookTypeLabel}${pages > 0 ? ` · ${formatCount(pages)} pages` : ""}`}
      tone={tone}
    />
  );
}

export default function ProfileReadingStatistics({ ownerId, profile, isCurrentOwner }: { ownerId: string; profile: ProfileRow; isCurrentOwner: (id: string) => boolean }) {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [bookCount, setBookCount] = useState<number | null>(null);
  const [finishedBookCount, setFinishedBookCount] = useState<number | null>(null);
  const [listenedBookCount, setListenedBookCount] = useState<number | null>(null);
  const [totalPagesRead, setTotalPagesRead] = useState<number | null>(null);
  const [totalMinutesSpent, setTotalMinutesSpent] = useState<number | null>(null);
  const [canShowPaceAverages, setCanShowPaceAverages] = useState(false);
  const [paceByBookType, setPaceByBookType] = useState<PaceByBookType[]>([]);
  const [paceIndex, setPaceIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadProfileHome() {
      setLoading(true);
      setErrorMsg("");
      setBookCount(null); setFinishedBookCount(null); setListenedBookCount(null);
      setTotalPagesRead(null); setTotalMinutesSpent(null); setPaceByBookType([]);

      try {
        const user = { id: ownerId };

	        const [
	          bookCountResult,
	          finishedBookCountResult,
          sessionTotalsResult,
	        ] = await Promise.all([
	          supabase
	            .from("user_books")
            .select("id", { count: "exact", head: true })
	            .eq("user_id", user.id)
            .neq("personal_tracking_status", "not_tracking")
	            .or("is_teacher_prep.is.null,is_teacher_prep.eq.false"),
	          supabase
	            .from("user_books")
	            .select("id", { count: "exact", head: true })
	            .eq("user_id", user.id)
            .neq("personal_tracking_status", "not_tracking")
	            .not("finished_at", "is", null)
	            .or("is_teacher_prep.is.null,is_teacher_prep.eq.false"),
          loadAllPagedRows<{ id: string } & SessionRow>((from, to) => supabase
            .from("user_book_reading_sessions")
            .select(
              `
              id,
              user_book_id,
              start_page,
              end_page,
              minutes_read,
              session_mode,
              is_filler,
              user_books!inner (
                user_id,
                is_teacher_prep,
                books (
                  book_type,
                  language_code
                )
              )
            `
            , { count: "exact" })
            .eq("user_books.user_id", user.id)
            .neq("user_books.personal_tracking_status", "not_tracking")
            .or("is_teacher_prep.is.null,is_teacher_prep.eq.false", {
              foreignTable: "user_books",
            }).order("id", { ascending: true }).range(from, to).returns<({ id: string } & SessionRow)[]>()),
	        ]);

	        if (bookCountResult.error) throw bookCountResult.error;
	        if (finishedBookCountResult.error) throw finishedBookCountResult.error;
        for (const result of [bookCountResult, finishedBookCountResult]) {
          if (!Number.isSafeInteger(result.count) || result.count! < 0) throw new Error("Book counts unavailable.");
        }
        if (!cancelled && isCurrentOwner(ownerId)) {
          const appAccessStatus = getAppAccessStatus({
            role: profile?.role ?? null,
            is_super_teacher: profile?.is_super_teacher ?? null,
            app_access_type: profile?.app_access_type ?? null,
            app_access_expires_at: profile?.app_access_expires_at ?? null,
          });
          const featureAccess = getFeatureAccess({
            role: profile?.role ?? null,
            isSuperTeacher: profile?.is_super_teacher ?? null,
            hasFullAccess: appAccessStatus.hasFullAccess,
            isTrialActive: appAccessStatus.isTrialActive,
          });
          const sessions = sessionTotalsResult.filter(
            (row) => !row.is_filler
          );
          const pagesRead = sessions.reduce((total, row) => {
            if (row.session_mode === "listening") return total;
            return total + sessionPages(row);
          }, 0);
          const minutesSpent = sessions.reduce(
            (total, row) => total + (row.minutes_read ?? 0),
            0
          );
          const listenedBooks = new Set(
            sessions
              .filter((row) => row.session_mode === "listening" && row.user_book_id)
              .map((row) => row.user_book_id)
          );

	          setBookCount(bookCountResult.count ?? 0);
	          setFinishedBookCount(finishedBookCountResult.count ?? 0);
          setListenedBookCount(listenedBooks.size);
          setTotalPagesRead(pagesRead);
          setTotalMinutesSpent(minutesSpent);
          setCanShowPaceAverages(featureAccess.hasPaidAccess);
          setPaceByBookType(buildPaceByBookType(sessions));
          setPaceIndex(0);
	        }
      } catch (error: any) {
        if (!cancelled && isCurrentOwner(ownerId)) {
          setErrorMsg(error?.message ?? "Could not load profile information.");
        }
      } finally {
        if (!cancelled && isCurrentOwner(ownerId)) setLoading(false);
      }
    }

    void loadProfileHome();

    return () => {
      cancelled = true;
    };
  }, [ownerId, profile, isCurrentOwner]);

  useEffect(() => {
    if (!canShowPaceAverages || paceByBookType.length <= 1) return;

    const intervalId = window.setInterval(() => {
      setPaceIndex((current) => (current + 1) % paceByBookType.length);
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [canShowPaceAverages, paceByBookType.length]);

  const selectedPace =
    paceByBookType.length > 0 ? paceByBookType[paceIndex % paceByBookType.length] : null;

  return (
    <div aria-label="Reading statistics" aria-busy={loading}>
      {loading ? <p role="status" className="mt-4 text-sm text-stone-600">Loading reading statistics…</p> : null}
      {errorMsg ? <p role="alert" className="mt-4 text-sm text-red-800">Reading statistics are unavailable. Please reload and try again.</p> : null}
        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <HighlightCard
            label="Books Read"
            value={formatCount(finishedBookCount)}
            detail="Total books read"
            tone="amber"
          />
          <HighlightCard
            label={(listenedBookCount ?? 0) > 0 ? "Books Listened To" : "Books in Library"}
            value={formatCount((listenedBookCount ?? 0) > 0 ? listenedBookCount : bookCount)}
            detail={
              (listenedBookCount ?? 0) > 0
                ? "Books with listening history"
                : "Total books in your library"
            }
            tone="emerald"
          />
	          <HighlightCard
	            label="Pages Read (not listened to)"
	            value={formatCount(totalPagesRead)}
	            detail="All page-tracked reading"
	            tone="sky"
	          />
          <HighlightCard
            label="Time Spent"
            value={formatMinutes(totalMinutesSpent)}
            detail="All logged reading/listening time"
            tone="violet"
          />
        </section>

        {canShowPaceAverages && selectedPace ? (
          <section className="mt-4 grid gap-4 md:grid-cols-2">
            <PaceAverageCard
              label="Average Curiosity Reading"
              value={formatMinPerPage(selectedPace.curiosityMinPerPage)}
              bookTypeLabel={selectedPace.label}
              pages={selectedPace.curiosityPages}
              tone="amber"
            />
            <PaceAverageCard
              label="Average Fluid Reading"
              value={formatMinPerPage(selectedPace.fluidMinPerPage)}
              bookTypeLabel={selectedPace.label}
              pages={selectedPace.fluidPages}
              tone="emerald"
            />
          </section>
        ) : null}

        <section className="mt-6 rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-500">
              Access
            </p>
            <Link
              href="/reading-access"
              className="inline-flex w-fit items-center justify-center rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-black text-stone-700 shadow-sm transition hover:border-stone-300 hover:bg-stone-50 hover:text-stone-950"
            >
              Membership &amp; Billing →
            </Link>
          </div>
          <AccessLabel profile={profile} />
        </section>
      <Link href="/community/stats" className="mt-4 inline-block text-sm font-bold text-stone-700 underline">View Detailed Reading Stats →</Link>
    </div>
  );
}
