// Library
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getLessonAlertInfo } from "@/lib/lessonAlerts";

type Book = {
  id: string;
  title: string;
  author: string | null;
  translator: string | null;
  illustrator: string | null;
  publisher: string | null;
  isbn13: string | null;
  cover_url: string | null;
  page_count: number | null;
};

type UserBookRow = {
  id: string;
  book_id: string;
  started_at: string | null;
  finished_at: string | null;
  dnf_at: string | null;
  notify_banner: boolean;
  has_new_vocab: boolean;
  has_new_reading: boolean;
  books: Book | null;
};

type ProfileRole = "teacher" | "member" | "student";

type StudentOption = {
  id: string;
  display_name: string;
  username?: string | null;
  level?: string | null;
  role?: ProfileRole | null;
};

type AlertBoxState = {
  title: string;
  message: string;
  alertKey: string;
  kind: "teacher_prepare" | "student_new_readings" | "student_last_chance";
  showBadge: boolean;
  badgeText: string | null;
} | null;

type TeacherPrepItem = {
  studentId: string;
  studentName: string;
  studentUsername: string | null;
  message: string;
  alertKey: string;
};

type ReadingSessionStats = {
  progressPercent: number | null;
  averageMinutesPerPage: number | null;
  furthestPage: number | null;
  wordsLookedUp: number | null;
};

type MonthlyLibraryStats = {
  pagesRead: number;
  daysRead: number;
  wordsSeen: number;
  timeReadMinutes: number;
  avgMinPerPage: number | null;
  booksTouched: number;
};

type MonthOption = {
  value: string; // YYYY-MM
  label: string; // April 2026
};

type UserBarVariant = "full" | "logoutOnly" | "labelOnly";

function getMonthOptions(count = 12): MonthOption[] {
  const opts: MonthOption[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
    opts.push({ value, label });
  }

  return opts;
}

function getMonthRange(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-01`;
  const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-01`;

  return { startStr, endStr };
}

function formatMinutesAsReadableTime(totalMinutes: number) {
  if (!totalMinutes || totalMinutes <= 0) return "—";

  if (totalMinutes < 60) return `${totalMinutes} min`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
}

function formatAvgMinPerPage(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(2);
}

function UserBar({
  isTeacher,
  variant = "full",
}: {
  isTeacher: boolean;
  variant?: UserBarVariant;
}) {
  const router = useRouter();
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loading = false;

    const loadUser = async () => {
      if (loading) return;
      loading = true;

      try {
        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (userErr || !user) {
          setLabel(null);
          return;
        }

        const { data: prof, error: profErr } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .single();

        if (cancelled) return;

        if (profErr) {
          console.warn("UserBar: could not load profile display_name:", profErr);
        }

        setLabel(prof?.display_name || "User");
      } catch (err) {
        if (!cancelled) {
          console.error("UserBar loadUser error:", err);
          setLabel(null);
        }
      } finally {
        loading = false;
      }
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadUser();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      return;
    }

    router.replace("/login");
    router.refresh();
  };

  if (!label && variant !== "logoutOnly") return null;

  if (variant === "logoutOnly") {
    return (
      <div className="flex justify-end">
        <button
          onClick={handleLogout}
          className="rounded-md border border-slate-400 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
        >
          Log out
        </button>
      </div>
    );
  }

  if (variant === "labelOnly") {
    if (!isTeacher) return null;
    return (
      <div className="mb-4 text-sm text-gray-700">
        <span>Logged in as: {label}</span>
      </div>
    );
  }

  return isTeacher ? (
    <div className="mb-4 flex items-center justify-between text-sm text-gray-700">
      <span>Logged in as: {label}</span>
      <button
        onClick={handleLogout}
        className="rounded-md border px-2 py-1 hover:bg-gray-100"
      >
        Log out
      </button>
    </div>
  ) : (
    <div className="mr-3 flex justify-end sm:mr-6">
      <button
        onClick={handleLogout}
        className="rounded-md border px-2 py-1 hover:bg-gray-100"
      >
        Log out
      </button>
    </div>
  );
}

function normalizeBookPart(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeIsbn(isbn: string | null | undefined) {
  return (isbn ?? "").replace(/[^0-9X]/gi, "");
}

function makeBookKey(title: string, author?: string | null) {
  return [normalizeBookPart(title), normalizeBookPart(author)].join("|");
}

export default function BooksPage() {
  const router = useRouter();
  const params = useParams<{ username: string }>();
  const routeUsername = params?.username ?? null;

  const [rows, setRows] = useState<UserBookRow[]>([]);
  const [readingStatsByUserBookId, setReadingStatsByUserBookId] = useState<
    Record<string, ReadingSessionStats>
  >({});

  const [alertBox, setAlertBox] = useState<AlertBoxState>(null);
  const [teacherPrepAlerts, setTeacherPrepAlerts] = useState<TeacherPrepItem[]>([]);

  const [message, setMessage] = useState<string>("");
  const [messageType, setMessageType] = useState<"error" | "success" | "">("");

  const [meId, setMeId] = useState<string>("");
  const [myUsername, setMyUsername] = useState<string>("");
  const [myRole, setMyRole] = useState<ProfileRole>("member");
  const [isSuperTeacher, setIsSuperTeacher] = useState(false);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [viewingUserId, setViewingUserId] = useState<string>("");

  const [newBookTitle, setNewBookTitle] = useState("");
  const [newBookAuthor, setNewBookAuthor] = useState("");
  const [newBookIsbn, setNewBookIsbn] = useState("");
  const [isSavingBook, setIsSavingBook] = useState(false);
  const [showAddBook, setShowAddBook] = useState(false);

  const [bookRequests, setBookRequests] = useState<any[]>([]);
  const [requestBookTitle, setRequestBookTitle] = useState("");
  const [requestBookAuthor, setRequestBookAuthor] = useState("");
  const [requestBookIsbn, setRequestBookIsbn] = useState("");
  const [isSavingRequest, setIsSavingRequest] = useState(false);
  const [showRequestBook, setShowRequestBook] = useState(false);

  const hasAnyNotifyBanner = rows.some((row) => row.notify_banner);
  const isTeacher = myRole === "teacher";

  const [viewMode, setViewMode] = useState<"cover" | "list">("cover");
  const [sortMode, setSortMode] = useState<"title" | "last_read" | "pace" | "lookups">("title");

  const monthOptions = getMonthOptions(12);

  const [selectedMonth, setSelectedMonth] = useState<string>(monthOptions[0]?.value ?? "");
  const [monthlyStats, setMonthlyStats] = useState<MonthlyLibraryStats>({
    pagesRead: 0,
    daysRead: 0,
    wordsSeen: 0,
    timeReadMinutes: 0,
    avgMinPerPage: null,
    booksTouched: 0,
  });
  const [monthlyStatsLoading, setMonthlyStatsLoading] = useState(false);

  const viewingLabel =
    viewingUserId && viewingUserId === meId
      ? "Me"
      : students.find((s) => s.id === viewingUserId)?.display_name || "Member";

  const avgPagesPerDay =
    monthlyStats.daysRead > 0 ? monthlyStats.pagesRead / monthlyStats.daysRead : null;

  async function loadMonthlyLibraryStats(userId: string, monthValue: string) {
    setMonthlyStatsLoading(true);

    try {
      const { startStr, endStr } = getMonthRange(monthValue);

      const { data: userBooksRows, error: userBooksErr } = await supabase
        .from("user_books")
        .select("id")
        .eq("user_id", userId);

      if (userBooksErr) {
        console.error("Error loading user_books for monthly stats:", userBooksErr);
        setMonthlyStats({
          pagesRead: 0,
          daysRead: 0,
          wordsSeen: 0,
          timeReadMinutes: 0,
          avgMinPerPage: null,
          booksTouched: 0,
        });
        return;
      }

      const userBookIds = (userBooksRows ?? []).map((r) => r.id).filter(Boolean);

      if (userBookIds.length === 0) {
        setMonthlyStats({
          pagesRead: 0,
          daysRead: 0,
          wordsSeen: 0,
          timeReadMinutes: 0,
          avgMinPerPage: null,
          booksTouched: 0,
        });
        return;
      }

      const [{ data: sessionRows, error: sessionErr }, { data: wordRows, error: wordErr }] =
        await Promise.all([
          supabase
            .from("user_book_reading_sessions")
            .select("user_book_id, read_on, start_page, end_page, minutes_read")
            .in("user_book_id", userBookIds)
            .gte("read_on", startStr)
            .lt("read_on", endStr),

          supabase
            .from("user_book_words")
            .select("user_book_id, surface, meaning, meaning_choice_index, created_at")
            .in("user_book_id", userBookIds)
            .gte("created_at", `${startStr}T00:00:00`)
            .lt("created_at", `${endStr}T00:00:00`),
        ]);

      if (sessionErr) {
        console.error("Error loading reading sessions for monthly stats:", sessionErr);
      }

      if (wordErr) {
        console.error("Error loading words for monthly stats:", wordErr);
      }

      const sessions = sessionRows ?? [];
      const words = wordRows ?? [];

      let pagesRead = 0;
      let timeReadMinutes = 0;

      const uniqueDays = new Set<string>();
      const uniqueBooksTouched = new Set<string>();

      for (const s of sessions) {
        if (s.read_on) uniqueDays.add(s.read_on);
        if (s.user_book_id) uniqueBooksTouched.add(String(s.user_book_id));

        const startPage = Number(s.start_page);
        const endPage = Number(s.end_page);

        if (Number.isFinite(startPage) && Number.isFinite(endPage) && endPage >= startPage) {
          pagesRead += endPage - startPage + 1;
        }

        const minutes = Number(s.minutes_read);
        if (Number.isFinite(minutes) && minutes > 0) {
          timeReadMinutes += minutes;
        }
      }

      const uniqueWordsSeen = new Set<string>();

      for (const w of words) {
        const surface = (w.surface ?? "").trim();
        const meaning = (w.meaning ?? "").trim();
        const meaningIndex = w.meaning_choice_index ?? "";
        const bookId = w.user_book_id ?? "";

        if (!surface) continue;

        uniqueWordsSeen.add(`${bookId}::${surface}::${meaning}::${meaningIndex}`);
      }

      const avgMinPerPage =
        pagesRead > 0 && timeReadMinutes > 0 ? timeReadMinutes / pagesRead : null;

      setMonthlyStats({
        pagesRead,
        daysRead: uniqueDays.size,
        wordsSeen: uniqueWordsSeen.size,
        timeReadMinutes,
        avgMinPerPage,
        booksTouched: uniqueBooksTouched.size,
      });
    } finally {
      setMonthlyStatsLoading(false);
    }
  }

  function logSbError(prefix: string, err: any) {
    console.error(prefix, err?.message, err?.details, err?.hint, err?.code, err);
  }

  async function fetchBooks(userIdToView: string) {
    setMessage("");
    setMessageType("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("Please sign in to see books.");
      setMessageType("error");
      setRows([]);
      return;
    }

    const targetUserId = myRole === "teacher" ? userIdToView : user.id;

    const { data, error } = await supabase
      .from("user_books")
      .select(
        `
          id,
          book_id,
          started_at,
          finished_at,
          dnf_at,
          notify_banner,
          has_new_vocab,
          has_new_reading,
          books:book_id (
            id,
            title,
            author,
            translator,
            illustrator,
            publisher,
            isbn13,
            cover_url,
            page_count
          )
        `
      )
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false });

    if (error) {
      logSbError("Error fetching user_books:", error);
      setMessage("Error loading books. (If viewing a student: confirm link + RLS policies.)");
      setMessageType("error");
      setRows([]);
      return;
    }

    const loadedRows = (data as any) || [];
    setRows(loadedRows);

    const userBookIds = loadedRows.map((r: any) => r.id);
    const pageCountByUserBookId: Record<string, number | null> = {};

    for (const r of loadedRows) {
      pageCountByUserBookId[r.id] = r.books?.page_count ?? null;
    }

    await loadReadingStatsForBooks(userBookIds, pageCountByUserBookId);
  }

  async function handleAddBook() {
    if (!isTeacher) {
      alert("Only teachers can add books right now.");
      return;
    }

    if (!meId) {
      alert("You need to be signed in to add a book.");
      return;
    }

    const cleanTitle = newBookTitle.trim();
    const cleanAuthor = newBookAuthor.trim();
    const cleanIsbn = normalizeIsbn(newBookIsbn);

    if (!cleanTitle) {
      alert("Please enter a title.");
      return;
    }

    const targetUserId = viewingUserId || meId;

    if (!isSuperTeacher && targetUserId !== meId) {
      const allowedStudentIds = students
        .filter((s) => (s.role === "member" || s.role === "student") && s.id !== meId)
        .map((s) => s.id);

      if (!allowedStudentIds.includes(targetUserId)) {
        alert("You can only add books for yourself or your own students.");
        return;
      }
    }

    setIsSavingBook(true);

    try {
      const bookKey = makeBookKey(cleanTitle, cleanAuthor || null);
      let bookId: string | null = null;

      if (cleanIsbn) {
        const { data: byIsbn, error: isbnLookupError } = await supabase
          .from("books")
          .select("id")
          .eq("isbn13", cleanIsbn)
          .maybeSingle();

        if (isbnLookupError) throw isbnLookupError;
        if (byIsbn) bookId = byIsbn.id;
      }

      if (!bookId) {
        const { data: byKey, error: keyLookupError } = await supabase
          .from("books")
          .select("id")
          .eq("book_key", bookKey)
          .maybeSingle();

        if (keyLookupError) throw keyLookupError;
        if (byKey) bookId = byKey.id;
      }

      if (!bookId) {
        const { data: insertedBook, error: insertBookError } = await supabase
          .from("books")
          .insert({
            title: cleanTitle,
            author: cleanAuthor || null,
            isbn13: cleanIsbn || null,
            book_key: bookKey,
          })
          .select("id")
          .single();

        if (insertBookError) throw insertBookError;
        bookId = insertedBook.id;
      }

      const { error: userBookError } = await supabase.from("user_books").insert({
        user_id: targetUserId,
        book_id: bookId,
      });

      if (userBookError) {
        if (userBookError.code === "23505") {
          alert("This user already has this book.");
          return;
        }
        throw userBookError;
      }

      setNewBookTitle("");
      setNewBookAuthor("");
      setNewBookIsbn("");
      setShowAddBook(false);
      await fetchBooks(viewingUserId || meId);

      alert("Book added!");
    } catch (err) {
      console.error("ADD BOOK ERROR:", err);
      alert("Could not add book.");
    } finally {
      setIsSavingBook(false);
    }
  }

  async function loadPendingBookRequests() {
    const { data, error } = await supabase
      .from("book_requests")
      .select(`
      id,
      title,
      author,
      isbn13,
      status,
      created_at,
      user_id,
      profiles:user_id (
        display_name,
        username
      )
    `)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      logSbError("Error loading book requests:", error);
      setBookRequests([]);
      return;
    }

    setBookRequests((data as any[]) ?? []);
  }

  async function handleRequestBook() {
    if (!meId) {
      alert("You need to be signed in to request a book.");
      return;
    }

    const cleanTitle = requestBookTitle.trim();
    const cleanAuthor = requestBookAuthor.trim();
    const cleanIsbn = normalizeIsbn(requestBookIsbn);

    if (!cleanTitle) {
      alert("Please enter a title.");
      return;
    }

    setIsSavingRequest(true);

    try {
      const { error } = await supabase.from("book_requests").insert({
        user_id: meId,
        title: cleanTitle,
        author: cleanAuthor || null,
        isbn13: cleanIsbn || null,
        status: "pending",
      });

      if (error) throw error;

      setRequestBookTitle("");
      setRequestBookAuthor("");
      setRequestBookIsbn("");
      setShowRequestBook(false);

      alert("Book request sent!");
    } catch (err) {
      console.error("REQUEST BOOK ERROR:", err);
      alert("Could not send book request.");
    } finally {
      setIsSavingRequest(false);
    }
  }

  async function loadReadingStatsForBooks(
    userBookIds: string[],
    pageCountByUserBookId: Record<string, number | null>
  ) {
    if (userBookIds.length === 0) {
      setReadingStatsByUserBookId({});
      return;
    }

    const { data, error } = await supabase
      .from("user_book_reading_sessions")
      .select("user_book_id, start_page, end_page, minutes_read")
      .in("user_book_id", userBookIds);

    if (error) {
      console.error("Error loading reading stats for library:", error);
      setReadingStatsByUserBookId({});
      return;
    }

    const { data: wordRows, error: wordErr } = await supabase
      .from("user_book_words")
      .select("user_book_id, surface, meaning, meaning_choice_index")
      .in("user_book_id", userBookIds);

    if (wordErr) {
      console.error("Error loading lookup stats for library:", wordErr);
    }

    console.log("userBookIds from library", userBookIds);
    console.log("wordRows sample", wordRows?.slice(0, 20));

    const grouped: Record<
      string,
      {
        furthestPage: number;
        totalTimedPages: number;
        totalTimedMinutes: number;
      }
    > = {};

    for (const row of data ?? []) {
      const userBookId = row.user_book_id as string;
      const startPage = Number((row as any).start_page);
      const endPage = Number((row as any).end_page);
      const rawMinutes = (row as any).minutes_read;
      const minutesRead = rawMinutes == null ? null : Number(rawMinutes);

      if (!grouped[userBookId]) {
        grouped[userBookId] = {
          furthestPage: 0,
          totalTimedPages: 0,
          totalTimedMinutes: 0,
        };
      }

      grouped[userBookId].furthestPage = Math.max(grouped[userBookId].furthestPage, endPage);

      if (minutesRead != null && Number.isFinite(minutesRead) && minutesRead > 0) {
        grouped[userBookId].totalTimedPages += endPage - startPage + 1;
        grouped[userBookId].totalTimedMinutes += minutesRead;
      }
    }

    const lookupCountsByUserBookId: Record<string, number> = {};

    if (wordRows) {
      for (const row of wordRows as any[]) {
        const userBookId = row.user_book_id as string;
        if (!userBookId) continue;

        lookupCountsByUserBookId[userBookId] =
          (lookupCountsByUserBookId[userBookId] ?? 0) + 1;
      }
    }

    const stats: Record<string, ReadingSessionStats> = {};

    for (const userBookId of userBookIds) {
      const pageCount = pageCountByUserBookId[userBookId];
      const g = grouped[userBookId];

      if (!g) {
        stats[userBookId] = {
          progressPercent: null,
          averageMinutesPerPage: null,
          furthestPage: null,
          wordsLookedUp: lookupCountsByUserBookId[userBookId] ?? 0,
        };
        continue;
      }

      const progressPercent =
        pageCount && pageCount > 0
          ? Math.min(100, Math.round((g.furthestPage / pageCount) * 100))
          : null;

      const averageMinutesPerPage =
        g.totalTimedPages > 0 ? g.totalTimedMinutes / g.totalTimedPages : null;

      stats[userBookId] = {
        progressPercent,
        averageMinutesPerPage,
        furthestPage: g.furthestPage,
        wordsLookedUp: lookupCountsByUserBookId[userBookId] ?? 0,
      };
    }

    console.log("lookupCountsByUserBookId", lookupCountsByUserBookId);
    console.log("stats", stats);

    setReadingStatsByUserBookId(stats);
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setMessage("");
      setMessageType("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (!cancelled) {
          setMessage("Please sign in to see your books.");
          setMessageType("error");
          setRows([]);
        }
        return;
      }

      if (cancelled) return;

      setMeId(user.id);

      const { data: meProfile, error: meProfileErr } = await supabase
        .from("profiles")
        .select("role, is_super_teacher, username")
        .eq("id", user.id)
        .single();

      if (meProfileErr) {
        logSbError("Error loading my profile role:", meProfileErr);
      }

      if (cancelled) return;

      setMyUsername((meProfile as any)?.username ?? "");

      const role = (meProfile?.role as ProfileRole | null) ?? "member";
      const superTeacherFlag = Boolean((meProfile as any)?.is_super_teacher);

      setMyRole(role);
      setIsSuperTeacher(superTeacherFlag);

      if (superTeacherFlag) {
        await loadPendingBookRequests();
      }

      if (routeUsername) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", routeUsername)
          .single();

        if (profile?.id) {
          setViewingUserId(profile.id);
        } else {
          setViewingUserId(user.id);
        }
      } else {
        setViewingUserId(user.id);
      }

      if (role !== "teacher") {
        setStudents([]);
        return;
      }

      if (superTeacherFlag) {
        const { data: profs, error: profErr } = await supabase
          .from("profiles")
          .select("id, display_name, username, level, role")
          .order("display_name", { ascending: true });

        if (profErr) {
          logSbError("Error loading all profiles:", profErr);
          if (!cancelled) setStudents([]);
          return;
        }

        if (cancelled) return;

        setStudents(
          (profs ?? []).map((p: any) => ({
            id: p.id,
            display_name: p.display_name || "User",
            username: p.username ?? null,
            level: p.level ?? null,
            role: p.role ?? null,
          }))
        );

        return;
      }

      const { data: rels, error: relErr } = await supabase
        .from("teacher_students")
        .select("student_id")
        .eq("teacher_id", user.id);

      if (relErr) {
        logSbError("Error loading teacher_students:", relErr);
        if (!cancelled) setStudents([]);
        return;
      }

      const studentIds = (rels ?? []).map((r: any) => r.student_id).filter(Boolean);

      if (studentIds.length === 0) {
        if (!cancelled) setStudents([]);
        return;
      }

      const { data: profs, error: profErr } = await supabase
        .from("profiles")
        .select("id, display_name, username, level, role")
        .in("id", studentIds)
        .order("display_name", { ascending: true });

      if (profErr) {
        logSbError("Error loading student profiles:", profErr);
        if (!cancelled) setStudents([]);
        return;
      }

      if (cancelled) return;

      const meOption: StudentOption = {
        id: user.id,
        display_name: "Me",
        username: (meProfile as any)?.username ?? null,
        level: null,
        role: "teacher",
      };

      const studentOptions: StudentOption[] = (profs ?? [])
        .filter((p: any) => p.id !== user.id && (p.role === "member" || p.role === "student"))
        .map((p: any) => ({
          id: p.id,
          display_name: p.display_name,
          username: p.username ?? null,
          level: p.level ?? null,
          role: p.role,
        }));

      const teacherOptions: StudentOption[] = (profs ?? [])
        .filter((p: any) => p.id !== user.id && p.role === "teacher")
        .map((p: any) => ({
          id: p.id,
          display_name: p.display_name,
          username: p.username ?? null,
          level: p.level ?? null,
          role: p.role,
        }));

      setStudents([meOption, ...studentOptions, ...teacherOptions]);
    })();

    return () => {
      cancelled = true;
    };
  }, [routeUsername]);

  useEffect(() => {
    if (!viewingUserId || !meId) return;

    setRows([]);
    fetchBooks(viewingUserId);
  }, [viewingUserId, meId, myRole]);

  useEffect(() => {
    if (!viewingUserId || !selectedMonth) return;
    loadMonthlyLibraryStats(viewingUserId, selectedMonth);
  }, [viewingUserId, selectedMonth]);

  useEffect(() => {
    const loadAlerts = async () => {
      if (!viewingUserId || !meId) {
        setAlertBox(null);
        setTeacherPrepAlerts([]);
        return;
      }

      if (isTeacher && viewingUserId === meId) {
        const studentIds = students
          .filter((s) => (s.role === "member" || s.role === "student") && s.id !== meId)
          .map((s) => s.id);

        if (studentIds.length === 0) {
          setTeacherPrepAlerts([]);
          setAlertBox(null);
          return;
        }

        const { data: completedRows, error: completedErr } = await supabase
          .from("teacher_alert_completions")
          .select("student_id, alert_key")
          .eq("teacher_id", meId);

        if (completedErr) {
          logSbError("Error loading completed teacher alerts:", completedErr);
        }

        const completedSet = new Set(
          (completedRows ?? []).map((r: any) => `${r.student_id}__${r.alert_key}`)
        );

        const { data: profiles, error } = await supabase
          .from("profiles")
          .select("id, display_name, username, lesson_day")
          .in("id", studentIds);

        if (error) {
          logSbError("Error loading student profiles for teacher alerts:", error);
          setTeacherPrepAlerts([]);
          setAlertBox(null);
          return;
        }

        const prepAlerts: TeacherPrepItem[] = (profiles ?? [])
          .map((p: any) => {
            const info = getLessonAlertInfo({
              lessonDay: p.lesson_day ?? null,
              isTeacherView: true,
              studentName: p.display_name ?? null,
            });

            if (!info || info.kind !== "teacher_prepare") return null;

            const key = `${p.id}__${info.alertKey}`;
            if (completedSet.has(key)) return null;

            return {
              studentId: p.id,
              studentName: p.display_name || "Member",
              studentUsername: p.username ?? null,
              message: info.message,
              alertKey: info.alertKey,
            };
          })
          .filter(Boolean) as TeacherPrepItem[];

        setTeacherPrepAlerts(prepAlerts);
        setAlertBox(null);
        return;
      }

      if (!isTeacher || viewingUserId !== meId) {
        const { data: viewedProfile, error } = await supabase
          .from("profiles")
          .select("id, display_name, lesson_day")
          .eq("id", viewingUserId)
          .single();

        if (error) {
          logSbError("Error loading viewed profile for alerts:", error);
          setAlertBox(null);
          setTeacherPrepAlerts([]);
          return;
        }

        const nextAlert = getLessonAlertInfo({
          lessonDay: viewedProfile?.lesson_day ?? null,
          isTeacherView: false,
          studentName: viewedProfile?.display_name ?? null,
        });

        const allowedAlert = !isTeacher && viewingUserId === meId ? nextAlert : null;

        setAlertBox((allowedAlert as AlertBoxState) ?? null);
        setTeacherPrepAlerts([]);
        return;
      }

      setAlertBox(null);
      setTeacherPrepAlerts([]);
    };

    loadAlerts();
  }, [viewingUserId, meId, isTeacher, students]);

  const validRows = rows.filter((r) => !!r.books);

  const currentlyReading = validRows.filter(
    (r) => !!r.started_at && !r.finished_at && !r.dnf_at
  );
  const notStarted = validRows.filter(
    (r) => !r.started_at && !r.finished_at && !r.dnf_at
  );
  const finished = validRows.filter((r) => !!r.finished_at && !r.dnf_at);
  const dnf = validRows.filter((r) => !!r.dnf_at);

  const gridClass =
    "grid grid-cols-2 gap-x-2 gap-y-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";

  function Section({
    title,
    subtitle,
    items,
  }: {
    title: string;
    subtitle?: string;
    items: UserBookRow[];
  }) {
    if (items.length === 0) return null;

    return (
      <section className="mb-10">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              {title} <span className="font-normal text-gray-500">({items.length})</span>
            </h2>
            {subtitle ? <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p> : null}
          </div>
        </div>

        <ul className={gridClass}>{items.map((row) => renderBookCard(row))}</ul>
      </section>
    );
  }

  function getStatusOrder(row: UserBookRow) {
    if (row.started_at && !row.finished_at && !row.dnf_at) return 0;
    if (!row.started_at && !row.finished_at && !row.dnf_at) return 1;
    if (row.finished_at && !row.dnf_at) return 2;
    if (row.dnf_at) return 3;
    return 4;
  }

  function getStatusLabel(row: UserBookRow) {
    if (row.finished_at && !row.dnf_at) return "Finished";
    if (row.dnf_at) return "DNF";
    if (row.started_at) return "In progress";
    return "Not started";
  }

  function sortLibraryItems(items: UserBookRow[]) {
    const copy = [...items];

    copy.sort((a, b) => {
      const aBook = a.books;
      const bBook = b.books;
      if (!aBook || !bBook) return 0;

      if (sortMode === "title") {
        return aBook.title.localeCompare(bBook.title);
      }

      if (sortMode === "pace") {
        const aPace =
          readingStatsByUserBookId[a.id]?.averageMinutesPerPage ?? Number.MAX_SAFE_INTEGER;
        const bPace =
          readingStatsByUserBookId[b.id]?.averageMinutesPerPage ?? Number.MAX_SAFE_INTEGER;
        return aPace - bPace;
      }

      if (sortMode === "last_read") {
        const aDate = a.finished_at ? new Date(a.finished_at).getTime() : 0;
        const bDate = b.finished_at ? new Date(b.finished_at).getTime() : 0;
        return bDate - aDate;
      }

      if (sortMode === "lookups") {
        const aLookups = readingStatsByUserBookId[a.id]?.wordsLookedUp ?? -1;
        const bLookups = readingStatsByUserBookId[b.id]?.wordsLookedUp ?? -1;
        return bLookups - aLookups;
      }

      return getStatusOrder(a) - getStatusOrder(b);
    });

    return copy;
  }

  function renderBookCard(row: UserBookRow) {
    const book = row.books;
    if (!book) return null;

    return (
      <li
        key={row.id}
        className="flex flex-col items-center rounded-lg p-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-200/40"
      >
        <a
          href={`/books/${row.id}`}
          onClick={(e) => e.stopPropagation()}
          className="block"
        >
          {book.cover_url ? (
            <img
              src={book.cover_url}
              alt={`${book.title} cover`}
              className="h-48 w-32 rounded-md object-cover shadow-md"
            />
          ) : (
            <div className="flex h-48 w-32 items-center justify-center rounded-md bg-gray-200 text-sm text-gray-400">
              No cover
            </div>
          )}
        </a>

        <a
          href={`/books/${row.id}`}
          onClick={(e) => e.stopPropagation()}
          className="mt-2 text-center text-sm font-medium underline hover:text-blue-700"
        >
          {book.title}
        </a>

        <div className="mt-2 w-full text-center">
          {row.finished_at ? (
            <div className="space-y-1 text-[11px] text-gray-500">
              {row.started_at ? (
                <div>Started: {new Date(row.started_at).toLocaleDateString()}</div>
              ) : null}
              <div>Finished: {new Date(row.finished_at).toLocaleDateString()}</div>
              <div>
                Avg:{" "}
                {readingStatsByUserBookId[row.id]?.averageMinutesPerPage != null
                  ? `${readingStatsByUserBookId[row.id].averageMinutesPerPage!.toFixed(2)} min/page`
                  : "—"}
              </div>
            </div>
          ) : row.dnf_at ? (
            <div className="text-[11px] text-gray-400">
              DNF: {new Date(row.dnf_at).toLocaleDateString()}
            </div>
          ) : row.started_at ? (
            <div className="space-y-1">
              <div className="text-[11px] text-gray-600">
                {readingStatsByUserBookId[row.id]?.progressPercent != null &&
                  readingStatsByUserBookId[row.id]?.furthestPage != null
                  ? `${readingStatsByUserBookId[row.id].progressPercent}% · p.${readingStatsByUserBookId[row.id].furthestPage}`
                  : "In progress"}
              </div>

              <div className="mx-auto h-3 w-20 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full bg-gray-700 transition-all"
                  style={{
                    width:
                      readingStatsByUserBookId[row.id]?.progressPercent != null
                        ? `${readingStatsByUserBookId[row.id].progressPercent}%`
                        : "8%",
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-gray-400">Not started</div>
          )}
        </div>
      </li>
    );
  }

  function renderBookRow(row: UserBookRow) {
    const book = row.books;
    if (!book) return null;

    const stats = readingStatsByUserBookId[row.id];
    console.log("book row", row.id, row.books?.title, stats?.wordsLookedUp);
    const status = getStatusLabel(row);

    return (
      <li
        key={row.id}
        className="cursor-pointer flex items-center gap-4 border-b px-3 py-3 hover:bg-stone-50"
        onClick={() => router.push(`/books/${row.id}`)}
      >
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt=""
            className="h-16 w-11 shrink-0 rounded object-cover"
          />
        ) : (
          <div className="h-16 w-11 shrink-0 rounded bg-gray-200" />
        )}

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-stone-900">{book.title}</div>
          <div className="mt-1 text-xs text-stone-500">{status}</div>
        </div>

        <div className="w-32 shrink-0 text-right text-xs text-stone-600">
          {sortMode === "lookups"
            ? stats?.wordsLookedUp && stats.wordsLookedUp > 0
              ? row.finished_at
                ? `${stats.wordsLookedUp} saved`
                : `${stats.wordsLookedUp} saved so far`
              : "—"
            : stats?.averageMinutesPerPage && stats.averageMinutesPerPage > 0
              ? row.finished_at
                ? `${stats.averageMinutesPerPage.toFixed(2)} min/page`
                : `${stats.averageMinutesPerPage.toFixed(2)} min/page so far`
              : "—"}
        </div>
      </li>
    );
  }

  function getLastReadValue(stats: ReadingSessionStats | undefined) {
    return stats?.furthestPage ?? -1;
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8">
      <div className="mx-auto max-w-screen-xl">
        <div className="mb-5 flex items-center justify-between gap-4 pr-6 sm:pr-10">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-semibold sm:text-3xl">My</span>
            <img
              src="/mekuru-logo.png"
              alt="Mekuru"
              className="h-12 w-12 object-contain sm:h-20 sm:w-20"
            />
            <span className="text-2xl font-semibold sm:text-3xl">Library</span>
          </div>

          <UserBar isTeacher={isTeacher} variant="logoutOnly" />
        </div>

        <div className="mb-6 w-full">
          <div className="ml-14 max-w-[720px] rounded-3xl border border-slate-400/70 bg-slate-300/45 p-4 shadow-sm sm:ml-20">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 sm:text-base">
                  Monthly Snapshot
                </h2>
                <p className="mt-1 text-xs text-slate-700">
                  Reading and study activity across all books
                </p>
              </div>

              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="rounded-xl border border-slate-400 bg-slate-50 px-3 py-1.5 text-sm text-slate-900"
              >
                {monthOptions.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-300/80 bg-white/75 p-2.5">
                <div className="text-[11px] text-slate-600">Pages</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {monthlyStatsLoading ? "…" : monthlyStats.pagesRead}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-300/80 bg-white/75 p-2.5">
                <div className="text-[11px] text-slate-600">Days</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {monthlyStatsLoading ? "…" : monthlyStats.daysRead}
                </div>
                <div className="mt-1 text-[10px] text-slate-500">Unique dates</div>
              </div>

              <div className="rounded-2xl border border-slate-300/80 bg-white/75 p-2.5">
                <div className="text-[11px] text-slate-600">Words Seen</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {monthlyStatsLoading ? "…" : monthlyStats.wordsSeen}
                </div>
                <div className="mt-1 text-[10px] text-slate-500">Saved this month</div>
              </div>

              <div className="rounded-2xl border border-slate-300/80 bg-white/75 p-2.5">
                <div className="text-[11px] text-slate-600">Time</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {monthlyStatsLoading
                    ? "…"
                    : formatMinutesAsReadableTime(monthlyStats.timeReadMinutes)}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-300/80 bg-white/75 p-2.5">
                <div className="text-[11px] text-slate-600">Avg min/page</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {monthlyStatsLoading ? "…" : formatAvgMinPerPage(monthlyStats.avgMinPerPage)}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-300/80 bg-white/75 p-2.5">
                <div className="text-[11px] text-slate-600">Avg pages/day</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {monthlyStatsLoading
                    ? "…"
                    : avgPagesPerDay != null
                      ? avgPagesPerDay.toFixed(1)
                      : "—"}
                </div>
              </div>
            </div>

            {!monthlyStatsLoading ? (
              <p className="mt-3 text-xs text-slate-700">
                You read across <span className="font-semibold">{monthlyStats.booksTouched}</span>{" "}
                {monthlyStats.booksTouched === 1 ? "book" : "books"} this month.
              </p>
            ) : null}
          </div>
        </div>

        <UserBar isTeacher={isTeacher} variant="labelOnly" />

        <div className="mb-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex overflow-hidden rounded-lg border bg-white text-sm">
              <button
                onClick={() => setViewMode("cover")}
                className={`px-3 py-1 ${viewMode === "cover" ? "bg-stone-800 text-white" : "text-stone-600"
                  }`}
              >
                Cover
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-3 py-1 ${viewMode === "list" ? "bg-stone-800 text-white" : "text-stone-600"
                  }`}
              >
                List
              </button>
            </div>

            {viewMode === "list" && (
              <select
                value={sortMode}
                onChange={(e) =>
                  setSortMode(e.target.value as "title" | "last_read" | "pace" | "lookups")
                }
                className="rounded-lg border bg-white px-3 py-1 text-sm text-stone-700"
              >
                <option value="title">Title</option>
                <option value="last_read">Recently Finished</option>
                <option value="pace">Avg Min/Page</option>
                <option value="lookups">Saved Vocab</option>
              </select>
            )}
          </div>

          {isTeacher ? (
            <div className="mb-4 max-w-md space-y-2">
              <div className="text-sm text-gray-700">
                Viewing: <span className="font-medium">{viewingLabel}</span>
              </div>

              <select
                value={viewingUserId || meId}
                onChange={(e) => {
                  const nextUserId = e.target.value;

                  if (nextUserId === meId) {
                    router.push(`/users/${myUsername}/books`);
                    return;
                  }

                  const selectedUser = students.find((s) => s.id === nextUserId);

                  if (selectedUser?.username) {
                    router.push(`/users/${selectedUser.username}/books`);
                  } else {
                    setViewingUserId(nextUserId);
                  }
                }}
                className="w-full rounded-lg border bg-white p-2"
                disabled={!meId}
              >
                <option value={meId}>Me</option>

                {students.some((s) => s.id !== meId) ? (
                  <optgroup label="Users">
                    {students
                      .filter((s) => s.id !== meId)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.display_name}
                          {s.level ? ` (${s.level})` : ""}
                        </option>
                      ))}
                  </optgroup>
                ) : null}
              </select>
            </div>
          ) : null}
        </div>

        <p className="mb-6 text-sm text-gray-600">
          All study tools live inside each book. Click a cover to open its Book Hub.
        </p>

        {viewMode === "cover" ? (
          <>
            <Section
              title="Currently Reading"
              subtitle="Started but not finished yet"
              items={currentlyReading}
            />
            <Section
              title="Want to Read"
              subtitle="Not started yet"
              items={notStarted}
            />
            <Section
              title="Finished"
              subtitle="Completed books"
              items={finished}
            />
            <Section
              title="DNF"
              subtitle="Did not finish"
              items={dnf}
            />
          </>
        ) : (
          <ul className="overflow-hidden rounded-xl border bg-white">
            {sortLibraryItems(validRows).map((row) => renderBookRow(row))}
          </ul>
        )}

        {validRows.length === 0 ? (
          <div className="mt-8 text-sm text-gray-600">No books yet.</div>
        ) : null}

        {isTeacher ? (
          <>
            <button
              type="button"
              onClick={() => setShowAddBook(true)}
              className="fixed bottom-6 right-6 z-40 rounded-full bg-black px-5 py-3 text-sm font-medium text-white shadow-lg"
            >
              + Add Book
            </button>

            {showAddBook ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold">
                        Add Book {viewingLabel ? `for ${viewingLabel}` : ""}
                      </h2>
                      <p className="mt-1 text-sm text-stone-500">
                        This book will be added to:{" "}
                        <span className="font-medium text-stone-700">{viewingLabel}</span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAddBook(false)}
                      className="rounded-lg px-2 py-1 text-sm text-stone-500 hover:bg-stone-100"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Title</label>
                      <input
                        type="text"
                        value={newBookTitle}
                        onChange={(e) => setNewBookTitle(e.target.value)}
                        placeholder="Enter book title"
                        className="w-full rounded-xl border px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">Author</label>
                      <input
                        type="text"
                        value={newBookAuthor}
                        onChange={(e) => setNewBookAuthor(e.target.value)}
                        placeholder="Enter author name"
                        className="w-full rounded-xl border px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">ISBN-13</label>
                      <input
                        type="text"
                        value={newBookIsbn}
                        onChange={(e) => setNewBookIsbn(e.target.value)}
                        placeholder="978..."
                        className="w-full rounded-xl border px-3 py-2"
                      />
                      <p className="mt-1 text-xs text-stone-500">
                        Hyphens and spaces are okay. They will be removed automatically.
                      </p>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddBook(false)}
                        className="rounded-xl border px-4 py-2 text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAddBook}
                        disabled={isSavingBook}
                        className="rounded-xl bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
                      >
                        {isSavingBook ? "Saving..." : "Add Book"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setShowRequestBook(true)}
              className="fixed bottom-6 right-6 z-40 rounded-full bg-black px-5 py-3 text-sm font-medium text-white shadow-lg"
            >
              + Request a Book
            </button>

            {showRequestBook ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Request a Book</h2>
                    <button
                      type="button"
                      onClick={() => setShowRequestBook(false)}
                      className="rounded-lg px-2 py-1 text-sm text-stone-500 hover:bg-stone-100"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Title</label>
                      <input
                        type="text"
                        value={requestBookTitle}
                        onChange={(e) => setRequestBookTitle(e.target.value)}
                        placeholder="Enter book title"
                        className="w-full rounded-xl border px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">Author</label>
                      <input
                        type="text"
                        value={requestBookAuthor}
                        onChange={(e) => setRequestBookAuthor(e.target.value)}
                        placeholder="Enter author name"
                        className="w-full rounded-xl border px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">ISBN-13</label>
                      <input
                        type="text"
                        value={requestBookIsbn}
                        onChange={(e) => setRequestBookIsbn(e.target.value)}
                        placeholder="978..."
                        className="w-full rounded-xl border px-3 py-2"
                      />
                      <p className="mt-1 text-xs text-stone-500">
                        Hyphens and spaces are okay. They will be removed automatically.
                      </p>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowRequestBook(false)}
                        className="rounded-xl border px-4 py-2 text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleRequestBook}
                        disabled={isSavingRequest}
                        className="rounded-xl bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
                      >
                        {isSavingRequest ? "Sending..." : "Request Book"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </main >
  );
}