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

type ProfileRole = "teacher" | "student";

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
};

function UserBar({ isTeacher }: { isTeacher: boolean }) {
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

  if (!label) return null;

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
    <div className="mb-4 flex items-center justify-end text-sm text-gray-700">
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
  const [myRole, setMyRole] = useState<ProfileRole>("student");
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [viewingUserId, setViewingUserId] = useState<string>("");

  const [newBookTitle, setNewBookTitle] = useState("");
  const [newBookAuthor, setNewBookAuthor] = useState("");
  const [newBookIsbn, setNewBookIsbn] = useState("");
  const [isSavingBook, setIsSavingBook] = useState(false);
  const [showAddBook, setShowAddBook] = useState(false);

  const hasAnyNotifyBanner = rows.some((row) => row.notify_banner);
  const isTeacher = myRole === "teacher";

  const viewingLabel =
    viewingUserId && viewingUserId === meId
      ? "Me"
      : students.find((s) => s.id === viewingUserId)?.display_name || "Student";

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
        user_id: meId,
        book_id: bookId,
      });

      if (userBookError) {
        if (userBookError.code === "23505") {
          alert("You already added this book.");
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

  async function loadReadingStatsForBooks(userBookIds: string[], pageCountByUserBookId: Record<string, number | null>) {
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

    const grouped: Record<
      string,
      { furthestPage: number; totalPagesRead: number; totalMinutesRead: number }
    > = {};

    for (const row of data ?? []) {
      const userBookId = row.user_book_id as string;
      const startPage = Number((row as any).start_page);
      const endPage = Number((row as any).end_page);
      const minutesRead = Number((row as any).minutes_read);

      if (!grouped[userBookId]) {
        grouped[userBookId] = {
          furthestPage: 0,
          totalPagesRead: 0,
          totalMinutesRead: 0,
        };
      }

      grouped[userBookId].furthestPage = Math.max(grouped[userBookId].furthestPage, endPage);
      grouped[userBookId].totalPagesRead += endPage - startPage + 1;
      grouped[userBookId].totalMinutesRead += minutesRead;
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
        };
        continue;
      }

      const progressPercent =
        pageCount && pageCount > 0
          ? Math.min(100, Math.round((g.furthestPage / pageCount) * 100))
          : null;

      const averageMinutesPerPage =
        g.totalPagesRead > 0 ? g.totalMinutesRead / g.totalPagesRead : null;

      stats[userBookId] = {
        progressPercent,
        averageMinutesPerPage,
        furthestPage: g.furthestPage,
      };
    }

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

      const role = (meProfile?.role as ProfileRole | null) ?? "student";
      const isSuperTeacher = Boolean((meProfile as any)?.is_super_teacher);

      setMyRole(role);

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

      if (isSuperTeacher) {
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
        .filter((p: any) => p.id !== user.id && p.role === "student")
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
    const loadAlerts = async () => {
      if (!viewingUserId || !meId) {
        setAlertBox(null);
        setTeacherPrepAlerts([]);
        return;
      }

      if (isTeacher && viewingUserId === meId) {
        const studentIds = students
          .filter((s) => s.role === "student" && s.id !== meId)
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
              studentName: p.display_name || "Student",
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

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8">
      <div className="mx-auto max-w-screen-xl">
        <h1 className="mb-2 text-2xl font-semibold">
          📚 {viewingLabel === "Me" ? "My Library" : `${viewingLabel}'s Library`}
        </h1>

        <p className="mb-4 text-sm text-gray-600">
          All study tools live inside each book. Click a cover to open the Book Hub.
        </p>

        <UserBar isTeacher={isTeacher} />

        {isTeacher && viewingUserId === meId && teacherPrepAlerts.length > 0 ? (
          <div className="mt-5 mb-6 max-w-2xl rounded-2xl border border-slate-300 bg-slate-50 px-4 py-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-800">📚 TEACHER REMINDERS</div>

            <div className="mt-2 flex flex-col gap-2">
              {teacherPrepAlerts.map((item) => (
                <div key={item.studentId} className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (item.studentUsername) {
                        router.push(`/users/${item.studentUsername}/books`);
                      } else {
                        setViewingUserId(item.studentId);
                      }
                    }}
                    className="text-left text-sm leading-6 text-slate-700 underline underline-offset-2 hover:text-slate-900"
                  >
                    {item.message}
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      const { error } = await supabase
                        .from("teacher_alert_completions")
                        .upsert(
                          {
                            teacher_id: meId,
                            student_id: item.studentId,
                            alert_key: item.alertKey,
                          },
                          { onConflict: "teacher_id,student_id,alert_key" }
                        );

                      if (error) {
                        logSbError("Error saving teacher alert completion:", error);
                        return;
                      }

                      setTeacherPrepAlerts((prev) =>
                        prev.filter(
                          (a) =>
                            !(
                              a.studentId === item.studentId &&
                              a.alertKey === item.alertKey
                            )
                        )
                      );
                    }}
                    className="shrink-0 rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                  >
                    Done
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {alertBox ? (
          <div className="mt-5 mb-6 max-w-2xl rounded-2xl border border-slate-300 bg-slate-50 px-4 py-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-800">{alertBox.title}</div>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
              {alertBox.message}
            </p>
          </div>
        ) : null}

        {hasAnyNotifyBanner ? (
          <div className="mt-5 mb-6 max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 shadow-sm">
            <div className="text-sm font-semibold text-amber-900">
              ✨ New study material is available
            </div>
            <p className="mt-2 text-sm leading-6 text-amber-800">
              New vocabulary and/or reading has been added.
            </p>
          </div>
        ) : null}

        {isTeacher ? (
          <div className="mb-4 flex flex-col gap-2">
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
              className="w-full rounded border bg-white p-2"
              disabled={!meId}
            >
              <option value={meId}>Me</option>

              {students.some((s) => s.role === "student" && s.id !== meId) ? (
                <optgroup label="Students">
                  {students
                    .filter((s) => s.role === "student" && s.id !== meId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.display_name}
                        {s.level ? ` (${s.level})` : ""}
                      </option>
                    ))}
                </optgroup>
              ) : null}

              {students.some((s) => s.role === "teacher" && s.id !== meId) ? (
                <optgroup label="Teachers">
                  {students
                    .filter((s) => s.role === "teacher" && s.id !== meId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.display_name}
                      </option>
                    ))}
                </optgroup>
              ) : null}
            </select>
          </div>
        ) : null}

        {message ? (
          <p
            className={`mb-4 text-sm ${messageType === "error" ? "text-red-600" : "text-green-700"
              }`}
          >
            {message}
          </p>
        ) : null}

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
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Add Book</h2>
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
        ) : null}

      </div>
    </main>
  );
}