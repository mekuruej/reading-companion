// Books Home
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

function UserBar({ isTeacher }: { isTeacher: boolean }) {
  const router = useRouter();
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !user) {
        setLabel(null);
        return;
      }

      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();

      if (profErr) {
        console.warn("UserBar: could not load profile display_name:", profErr);
      }

      setLabel(prof?.display_name || "User");
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => loadUser());

    return () => subscription.unsubscribe();
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
    <div className="flex justify-between items-center mb-4 text-sm text-gray-700">
      <span>Logged in as: {label}</span>
      <button
        onClick={handleLogout}
        className="border px-2 py-1 rounded-md hover:bg-gray-100"
      >
        Log out
      </button>
    </div>
  ) : (
    <div className="flex justify-end items-center mb-4 text-sm text-gray-700">
      <button
        onClick={handleLogout}
        className="border px-2 py-1 rounded-md hover:bg-gray-100"
      >
        Log out
      </button>
    </div>
  );
}

export default function BooksPage() {
  const router = useRouter();
  const params = useParams<{ username: string }>();
  const routeUsername = params?.username ?? null;

  const [rows, setRows] = useState<UserBookRow[]>([]);

  const [alertBox, setAlertBox] = useState<AlertBoxState>(null);
  const [studentBadge, setStudentBadge] = useState<string | null>(null);
  const [teacherPrepAlerts, setTeacherPrepAlerts] = useState<TeacherPrepItem[]>([]);

  const [finishingUserBookId, setFinishingUserBookId] = useState<string | null>(null);
  const [finishDate, setFinishDate] = useState("");

  const [startingUserBookId, setStartingUserBookId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");

  const [dnfingUserBookId, setDnfingUserBookId] = useState<string | null>(null);
  const [dnfDate, setDnfDate] = useState("");

  const [message, setMessage] = useState<string>("");
  const [messageType, setMessageType] = useState<"error" | "success" | "">("");

  const [meId, setMeId] = useState<string>("");
  const [myUsername, setMyUsername] = useState<string>("");
  const [myRole, setMyRole] = useState<ProfileRole>("student");
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [viewingUserId, setViewingUserId] = useState<string>("");
  const [includeVocabNotify, setIncludeVocabNotify] = useState(true);
  const [includeReadingNotify, setIncludeReadingNotify] = useState(true);

  const hasAnyNotifyBanner = rows.some((row) => row.notify_banner);
  const isTeacher = myRole === "teacher";

  const currentUsernameForLinks = routeUsername ?? myUsername;

  const viewingLabel =
    viewingUserId && viewingUserId === meId
      ? "Me"
      : students.find((s) => s.id === viewingUserId)?.display_name || "Student";

  const handleNotifyStudent = async (e: React.MouseEvent, userBookId: string) => {
    e.stopPropagation();

    if (!includeVocabNotify && !includeReadingNotify) {
      alert("Select at least one: Vocab or Readings.");
      return;
    }

    const updates: {
      notify_banner: boolean;
      has_new_vocab?: boolean;
      has_new_reading?: boolean;
    } = {
      notify_banner: true,
    };

    if (includeVocabNotify) updates.has_new_vocab = true;
    if (includeReadingNotify) updates.has_new_reading = true;

    const { error } = await supabase
      .from("user_books")
      .update(updates)
      .eq("id", userBookId);

    if (error) {
      console.error("Failed to notify student:", error);
      alert("Could not notify student.");
      return;
    }

    setRows((prev) =>
      prev.map((row) =>
        row.id === userBookId
          ? {
              ...row,
              notify_banner: true,
              has_new_vocab: includeVocabNotify ? true : row.has_new_vocab,
              has_new_reading: includeReadingNotify ? true : row.has_new_reading,
            }
          : row
      )
    );

    alert("Student notified.");
  };

  const openVocabList = async (e: React.MouseEvent, userBookId: string) => {
    e.stopPropagation();

    await supabase
      .from("user_books")
      .update({
        notify_banner: false,
        has_new_vocab: false,
      })
      .eq("id", userBookId);

    setRows((prev) =>
      prev.map((row) =>
        row.id === userBookId
          ? { ...row, notify_banner: false, has_new_vocab: false }
          : row
      )
    );

    router.push(`/books/${userBookId}/words`);
  };

  const openStudyVocab = async (e: React.MouseEvent, userBookId: string) => {
    e.stopPropagation();

    await supabase
      .from("user_books")
      .update({
        notify_banner: false,
        has_new_vocab: false,
      })
      .eq("id", userBookId);

    setRows((prev) =>
      prev.map((row) =>
        row.id === userBookId
          ? { ...row, notify_banner: false, has_new_vocab: false }
          : row
      )
    );

    router.push(`/books/${userBookId}/study`);
  };

  const openWeeklyReadings = async (e: React.MouseEvent, userBookId: string) => {
    e.stopPropagation();

    await markAlertSeen();

    await supabase
      .from("user_books")
      .update({
        notify_banner: false,
        has_new_reading: false,
      })
      .eq("id", userBookId);

    setRows((prev) =>
      prev.map((row) =>
        row.id === userBookId
          ? { ...row, notify_banner: false, has_new_reading: false }
          : row
      )
    );

    router.push(`/books/${userBookId}/weekly-readings`);
  };

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
            cover_url
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

    setRows((data as any) || []);
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

  useEffect(() => {
    const loadSeenState = async () => {
      if (!alertBox?.showBadge) {
        setStudentBadge(null);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setStudentBadge(null);
        return;
      }

      const { data, error } = await supabase
        .from("user_alert_reads")
        .select("id")
        .eq("user_id", user.id)
        .eq("alert_key", alertBox.alertKey)
        .maybeSingle();

      if (error) {
        logSbError("Error checking alert seen state:", error);
        setStudentBadge(alertBox.badgeText);
        return;
      }

      setStudentBadge(data ? null : alertBox.badgeText);
    };

    loadSeenState();
  }, [alertBox]);

  async function markAlertSeen() {
    if (!alertBox?.showBadge) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase.from("user_alert_reads").upsert(
      {
        user_id: user.id,
        alert_key: alertBox.alertKey,
      },
      { onConflict: "user_id,alert_key" }
    );

    if (error) {
      logSbError("Error marking alert seen:", error);
      return;
    }

    setStudentBadge(null);
  }

  async function saveStartedDate(userBookId: string) {
    if (!startDate) return;

    const { error } = await supabase
      .from("user_books")
      .update({ started_at: startDate })
      .eq("id", userBookId);

    if (error) {
      logSbError("Error saving start date:", error);
      setMessage("Error saving start date.");
      setMessageType("error");
      return;
    }

    setStartingUserBookId(null);
    setStartDate("");
    fetchBooks(viewingUserId || meId);
  }

  async function saveFinishedDate(userBookId: string) {
    if (!finishDate) return;

    const { error } = await supabase
      .from("user_books")
      .update({ finished_at: finishDate, dnf_at: null })
      .eq("id", userBookId);

    if (error) {
      logSbError("Error saving finish date:", error);
      setMessage("Error saving finish date.");
      setMessageType("error");
      return;
    }

    setFinishingUserBookId(null);
    setFinishDate("");
    fetchBooks(viewingUserId || meId);
  }

  async function saveDnfDate(userBookId: string) {
    if (!dnfDate) return;

    const { error } = await supabase
      .from("user_books")
      .update({ dnf_at: dnfDate, finished_at: null })
      .eq("id", userBookId);

    if (error) {
      logSbError("Error saving DNF date:", error);
      setMessage("Error saving DNF date.");
      setMessageType("error");
      return;
    }

    setDnfingUserBookId(null);
    setDnfDate("");
    fetchBooks(viewingUserId || meId);
  }

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
    "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-2 gap-y-3";

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
        <div className="flex items-end justify-between gap-4 mb-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              {title} <span className="text-gray-500 font-normal">({items.length})</span>
            </h2>
            {subtitle ? (
              <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
            ) : null}
          </div>
        </div>

        <ul className={gridClass}>{items.map((row) => renderBookCard(row))}</ul>
      </section>
    );
  }

  function renderBookCard(row: UserBookRow) {
    const book = row.books;
    if (!book) return null;

    const canStudy = !!row.started_at && !row.finished_at && !row.dnf_at;

    return (
      <li
        key={row.id}
        className="flex flex-col items-center p-2 rounded-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-200/40 cursor-pointer"
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
              className="w-32 h-48 object-cover rounded-md shadow-md"
            />
          ) : (
            <div className="w-32 h-48 bg-gray-200 rounded-md mb-2 flex items-center justify-center text-gray-400 text-sm">
              No cover
            </div>
          )}
        </a>

        <a
  href={`/books/${row.id}`}
  onClick={(e) => e.stopPropagation()}
  className="text-center font-medium text-sm underline hover:text-blue-700 mt-2"
>
          {book.title}
        </a>

        {book.author && <span className="text-gray-600 text-xs">著：{book.author}</span>}
        {book.translator && (
          <span className="text-gray-500 text-xs">訳：{book.translator}</span>
        )}
        {book.illustrator && (
          <span className="text-gray-500 text-xs">絵：{book.illustrator}</span>
        )}

        <div className="mt-1 text-[11px] text-gray-500 text-center">
          {row.started_at ? (
            <div>Started: {new Date(row.started_at).toLocaleDateString()}</div>
          ) : startingUserBookId === row.id ? (
            <div className="mt-1 flex flex-col gap-1 text-[11px]">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border p-1 rounded text-xs"
                onClick={(e) => e.stopPropagation()}
              />

              <div className="flex gap-2 justify-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveStartedDate(row.id);
                  }}
                  className="text-blue-600 underline hover:text-blue-800"
                >
                  Save
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setStartingUserBookId(null);
                    setStartDate("");
                  }}
                  className="text-gray-500 underline hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : !row.finished_at && !row.dnf_at ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setStartingUserBookId(row.id);
                setStartDate(new Date().toISOString().split("T")[0]);
              }}
              className="mt-1 text-[11px] text-blue-600 underline hover:text-blue-800"
            >
              Mark as Started
            </button>
          ) : null}

          {row.finished_at ? (
            <div>Finished: {new Date(row.finished_at).toLocaleDateString()}</div>
          ) : row.dnf_at ? (
            <div>DNF: {new Date(row.dnf_at).toLocaleDateString()}</div>
          ) : finishingUserBookId === row.id ? (
            <div className="mt-1 flex flex-col gap-1 text-[11px]">
              <input
                type="date"
                value={finishDate}
                onChange={(e) => setFinishDate(e.target.value)}
                className="border p-1 rounded text-xs"
                onClick={(e) => e.stopPropagation()}
              />

              <div className="flex gap-2 justify-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveFinishedDate(row.id);
                  }}
                  className="text-blue-600 underline hover:text-blue-800"
                >
                  Save
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFinishingUserBookId(null);
                    setFinishDate("");
                  }}
                  className="text-gray-500 underline hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : dnfingUserBookId === row.id ? (
            <div className="mt-1 flex flex-col gap-1 text-[11px]">
              <input
                type="date"
                value={dnfDate}
                onChange={(e) => setDnfDate(e.target.value)}
                className="border p-1 rounded text-xs"
                onClick={(e) => e.stopPropagation()}
              />

              <div className="flex gap-2 justify-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveDnfDate(row.id);
                  }}
                  className="text-red-600 underline hover:text-red-800"
                >
                  Save DNF
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDnfingUserBookId(null);
                    setDnfDate("");
                  }}
                  className="text-gray-500 underline hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : row.started_at ? (
            <div className="mt-1 flex justify-center gap-4 text-[11px]">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFinishingUserBookId(row.id);
                  setDnfingUserBookId(null);
                  setDnfDate("");
                  setFinishDate(new Date().toISOString().split("T")[0]);
                }}
                className="text-blue-600 underline hover:text-blue-800"
              >
                Mark as Finished
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDnfingUserBookId(row.id);
                  setFinishingUserBookId(null);
                  setFinishDate("");
                  setDnfDate(new Date().toISOString().split("T")[0]);
                }}
                className="text-red-600 underline hover:text-red-800"
              >
                Mark as DNF
              </button>
            </div>
          ) : null}
        </div>

        <div className="mt-2 flex flex-col items-center gap-2 w-full">
          <div className="text-[10px] uppercase tracking-wide text-gray-500">
            Read → Review → Practice
          </div>

          <div className="w-full flex flex-col items-center gap-2">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Student Tools
            </div>

            <button
              onClick={(e) => openVocabList(e, row.id)}
              className="w-full max-w-[160px] inline-flex items-center justify-center gap-2 text-center text-[12px] px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-800 transition"
            >
              <span>Vocab List</span>
              {row.has_new_vocab ? (
                <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                  New
                </span>
              ) : null}
            </button>

            {canStudy ? (
              <>
                <button
                  onClick={(e) => openStudyVocab(e, row.id)}
                  className="w-full max-w-[160px] inline-flex items-center justify-center gap-2 text-center text-[12px] px-3 py-2 bg-green-700 text-white rounded hover:bg-green-800 transition"
                >
                  <span>Study Vocab</span>
                  {row.has_new_vocab ? (
                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                      New
                    </span>
                  ) : null}
                </button>

                <button
                  onClick={(e) => openWeeklyReadings(e, row.id)}
                  className="w-full max-w-[160px] inline-flex items-center justify-center gap-2 text-center text-[12px] px-3 py-2 bg-purple-700 text-white rounded hover:bg-purple-800 transition"
                >
                  <span>Practice Readings</span>
                  {row.has_new_reading ? (
                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                      New
                    </span>
                  ) : studentBadge ? (
                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                      {studentBadge}
                    </span>
                  ) : null}
                </button>
              </>
            ) : null}
          </div>

          {isTeacher && canStudy ? (
            <div className="w-full flex flex-col items-center gap-2 pt-1">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                Teacher Tools
              </div>

              <a
                href={`/vocab/bulk?userBookId=${row.id}`}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-[160px] text-center text-[12px] px-3 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 transition"
              >
                Add Vocab
              </a>

              <a
                href={`/books/${row.id}/weekly-readings/prepare`}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-[160px] text-center text-[12px] px-3 py-2 bg-indigo-700 text-white rounded hover:bg-indigo-800 transition"
              >
                Prepare Readings
              </a>

              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-[160px] rounded border border-gray-300 bg-white px-3 py-2 text-[11px] text-gray-700"
              >
                <div className="font-semibold text-[10px] uppercase tracking-wide text-gray-500 mb-2">
                  Notify Includes
                </div>

                <label className="flex items-center gap-2 mb-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeVocabNotify}
                    onChange={(e) => setIncludeVocabNotify(e.target.checked)}
                  />
                  <span>Vocab</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeReadingNotify}
                    onChange={(e) => setIncludeReadingNotify(e.target.checked)}
                  />
                  <span>Readings</span>
                </label>
              </div>

              <button
                onClick={(e) => handleNotifyStudent(e, row.id)}
                className="w-full max-w-[160px] text-center text-[12px] px-3 py-2 bg-pink-700 text-white rounded hover:bg-pink-800 transition"
              >
                Notify Student
              </button>
            </div>
          ) : null}
        </div>
      </li>
    );
  }

  return (
    <main className="min-h-screen p-8 bg-stone-50">
      <h1 className="text-2xl font-semibold mb-2">
        📚 {viewingLabel === "Me" ? "My Books" : `${viewingLabel}'s Books`}
      </h1>

      <UserBar isTeacher={isTeacher} />

      {isTeacher && viewingUserId === meId && teacherPrepAlerts.length > 0 ? (
        <div className="mt-5 mb-6 rounded-2xl border border-slate-300 bg-slate-50 px-4 py-4 shadow-sm max-w-2xl">
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
      className="text-left text-sm leading-6 text-slate-700 hover:text-slate-900 underline underline-offset-2"
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
        <div className="mt-5 mb-6 rounded-2xl border border-slate-300 bg-slate-50 px-4 py-4 shadow-sm max-w-2xl">
          <div className="text-sm font-semibold text-slate-800">{alertBox.title}</div>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
            {alertBox.message}
          </p>
        </div>
      ) : null}

      {hasAnyNotifyBanner ? (
        <div className="mt-5 mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 shadow-sm max-w-2xl">
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

          <div className="text-xs text-gray-400">viewingUserId: {viewingUserId}</div>

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
            className="border p-2 rounded w-full bg-white"
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
          className={`mb-4 text-sm ${
            messageType === "error" ? "text-red-600" : "text-green-700"
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
        subtitle="Not started yet • Study buttons will appear once marked started."
        items={notStarted}
      />
      <Section
        title="Finished"
        subtitle="Completed books • Study buttons can be found in Vocab List."
        items={finished}
      />
      <Section title="DNF" subtitle="Did not finish" items={dnf} />

      {validRows.length === 0 ? (
        <div className="text-sm text-gray-600 mt-8">No books yet.</div>
      ) : null}
    </main>
  );
}