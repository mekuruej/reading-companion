// Add / Prep a Book
// 

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type ProfileRow = {
  id: string;
  display_name: string | null;
  level: string | null; // "beginner" | "intermediate" | "advanced" etc
  is_public: boolean | null;
  created_at: string | null;
  role?: string | null;
  is_super_teacher?: boolean | null;
};

type TeacherStudentLink = {
  student_id?: string | null;
};

type BookRow = {
  id: string;
  title: string | null;
  author: string | null;
  cover_url: string | null;
  page_count: number | null;
  book_type: string | null;
  isbn13: string | null;
  publisher: string | null;
};

type UserBookRow = {
  id: string;
  user_id: string;
  book_id: string;
  status: string | null;
  current_location: string | null;
  started_at: string | null;
  created_at: string | null;
};

type PrepItemRow = {
  id: string;
  learner_id: string | null;
  book_id: string;
  status: string;
  notes: string | null;
  created_at: string;
  books: BookRow | BookRow[] | null;
};

type ActionMode = "add_to_library" | "prep_future";

function labelProfile(p: ProfileRow) {
  const name = (p.display_name ?? "").trim();
  const lvl = (p.level ?? "").trim();
  if (name && lvl) return `${name} (${lvl})`;
  if (name) return name;
  if (lvl) return `${p.id} (${lvl})`;
  return p.id;
}

function getPrepBook(bookRow: PrepItemRow["books"]) {
  if (Array.isArray(bookRow)) return bookRow[0] ?? null;
  return bookRow ?? null;
}

function missingBookInfo(book: BookRow | undefined) {
  if (!book) return [];

  const missing: string[] = [];
  if (!book.author) missing.push("author");
  if (!book.cover_url) missing.push("cover");
  if (!book.page_count) missing.push("page count");
  if (!book.book_type) missing.push("book type");
  if (!book.isbn13) missing.push("ISBN");
  return missing;
}

function bookSearchText(book: BookRow) {
  return [book.title, book.author, book.isbn13, book.publisher, book.book_type]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function prospectiveLearnerLabel(notes: string | null | undefined) {
  const clean = (notes ?? "").trim();
  if (!clean) return "Prospective learner";

  const nameMatch = clean.match(/Prospective learner:\s*([^\n]+)/i);
  const contactMatch = clean.match(/Contact:\s*([^\n]+)/i);
  const name = nameMatch?.[1]?.trim();
  const contact = contactMatch?.[1]?.trim();

  if (name && contact) return `${name} (${contact})`;
  if (name) return name;
  if (contact) return contact;
  return "Prospective learner";
}

export default function AssignBookPage() {
  const [loading, setLoading] = useState(true);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [meId, setMeId] = useState<string | null>(null);
  const [canAccess, setCanAccess] = useState(false);
  const [isSuperTeacher, setIsSuperTeacher] = useState(false);

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [books, setBooks] = useState<BookRow[]>([]);
  const [prepItems, setPrepItems] = useState<PrepItemRow[]>([]);

  const [studentId, setStudentId] = useState<string>("");
  const [bookId, setBookId] = useState<string>("");
  const [bookSearch, setBookSearch] = useState("");
  const [actionMode, setActionMode] = useState<ActionMode>("add_to_library");
  const [prospectiveLearnerName, setProspectiveLearnerName] = useState("");
  const [prospectiveLearnerContact, setProspectiveLearnerContact] = useState("");

  const selectableProfiles = useMemo(() => {
    return profiles.filter((p) => p.id !== meId);
  }, [profiles, meId]);

  const selectedBook = books.find((book) => book.id === bookId);
  const selectedBookMissingInfo = missingBookInfo(selectedBook);
  const profileNameById = useMemo(() => {
    return new Map(profiles.map((profile) => [profile.id, labelProfile(profile)]));
  }, [profiles]);
  const filteredBooks = useMemo(() => {
    const query = bookSearch.trim().toLowerCase();
    if (!query) return books;

    return books.filter((book) => bookSearchText(book).includes(query));
  }, [books, bookSearch]);

  useEffect(() => {
    // If studentId is empty OR no longer exists in options, set a valid default.
    if (selectableProfiles.length === 0) return;

    const stillValid = selectableProfiles.some((p) => p.id === studentId);
    if (!studentId || !stillValid) {
      setStudentId(selectableProfiles[0].id);
    }
  }, [selectableProfiles, studentId]);

  useEffect(() => {
    if (filteredBooks.length === 0) return;
    if (bookId && filteredBooks.some((book) => book.id === bookId)) return;

    setBookId(filteredBooks[0].id);
  }, [filteredBooks, bookId]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      setNeedsSignIn(false);

      try {
        const { data: userData } = await supabase.auth.getUser();
        const authUser = userData?.user;

        if (!authUser) {
          setNeedsSignIn(true);
          return;
        }

        setMeId(authUser.id);

        const { data: meProfile, error: meProfileError } = await supabase
          .from("profiles")
          .select("id, role, is_super_teacher")
          .eq("id", authUser.id)
          .maybeSingle();

        if (meProfileError) throw meProfileError;

        const superTeacher =
          meProfile?.role === "super_teacher" || !!meProfile?.is_super_teacher;
        const teacher =
          superTeacher || meProfile?.role === "teacher";

        setCanAccess(teacher);
        setIsSuperTeacher(superTeacher);

        if (!teacher) {
          setErrorMsg("Teacher access is required.");
          return;
        }

        let pList: ProfileRow[] = [];

        if (superTeacher) {
          const { data: profileRows, error: pErr } = await supabase
            .from("profiles")
            .select("id, display_name, level, is_public, created_at, role")
            .order("display_name", { ascending: true });

          if (pErr) throw pErr;
          pList = (profileRows ?? []) as ProfileRow[];
        } else {
          const { data: links, error: linksError } = await supabase
            .from("teacher_students")
            .select("student_id")
            .eq("teacher_id", authUser.id);

          if (linksError) throw linksError;

          const studentIds = Array.from(
            new Set(
              ((links ?? []) as TeacherStudentLink[])
                .map((link) => link.student_id)
                .filter(Boolean) as string[]
            )
          );

          if (studentIds.length > 0) {
            const { data: profileRows, error: pErr } = await supabase
              .from("profiles")
              .select("id, display_name, level, is_public, created_at, role")
              .in("id", studentIds)
              .order("display_name", { ascending: true });

            if (pErr) throw pErr;
            pList = (profileRows ?? []) as ProfileRow[];
          }
        }

        setProfiles(pList);

        // Load books
        const { data: bookRows, error: bErr } = await supabase
          .from("books")
          .select("id, title, author, cover_url, page_count, book_type, isbn13, publisher")
          .order("title", { ascending: true });

        if (bErr) throw bErr;

        const bList = (bookRows ?? []) as BookRow[];
        setBooks(bList);

        // Default selections
        const firstStudent = pList.find((p) => p.id !== authUser.id);
        if (firstStudent) setStudentId(firstStudent.id);
        if (bList.length > 0) setBookId(bList[0].id);

        const { data: prepRows, error: prepErr } = await supabase
          .from("teacher_book_prep_items")
          .select(
            `
            id,
            learner_id,
            book_id,
            status,
            notes,
            created_at,
            books:book_id (
              id,
              title,
              author,
              cover_url,
              page_count,
              book_type,
              isbn13,
              publisher
            )
          `
          )
          .eq("teacher_id", authUser.id)
          .in("status", ["prepping", "ready"])
          .order("created_at", { ascending: false });

        if (prepErr) {
          console.error("Could not load prep shelf:", prepErr);
        } else {
          setPrepItems((prepRows ?? []) as PrepItemRow[]);
        }
      } catch (e: any) {
        setErrorMsg(e?.message ?? "Failed to load assign page");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  async function handlePrimaryAction() {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!meId) return setErrorMsg("Please sign in again.");
    if (!bookId) return setErrorMsg("Pick a book.");

    try {
      if (actionMode === "prep_future") {
        const cleanProspectiveName = prospectiveLearnerName.trim();
        const cleanProspectiveContact = prospectiveLearnerContact.trim();

        if (!cleanProspectiveName && !cleanProspectiveContact) {
          return setErrorMsg("Add a name or email/note for the future learner.");
        }

        const prepNotes = [
          cleanProspectiveName ? `Prospective learner: ${cleanProspectiveName}` : null,
          cleanProspectiveContact ? `Contact: ${cleanProspectiveContact}` : null,
        ]
          .filter(Boolean)
          .join("\n");

        const { data: prepData, error: prepError } = await supabase
          .from("teacher_book_prep_items")
          .insert({
            teacher_id: meId,
            learner_id: null,
            book_id: bookId,
            status: "prepping",
            notes: prepNotes,
          })
          .select(
            `
            id,
            learner_id,
            book_id,
            status,
            notes,
            created_at,
            books:book_id (
              id,
              title,
              author,
              cover_url,
              page_count,
              book_type,
              isbn13,
              publisher
            )
          `
          )
          .single<PrepItemRow>();

        if (prepError) {
          if (prepError.code === "23505") {
            setSuccessMsg("This book is already on your prep shelf for that future learner.");
            return;
          }
          throw prepError;
        }

        const chosenBook = books.find((b) => b.id === bookId);

        setPrepItems((prev) => [prepData, ...prev]);

        setSuccessMsg(
          `Added "${chosenBook?.title ?? "Untitled"}" to your prep shelf for ${prospectiveLearnerLabel(prepNotes)}.`
        );
        return;
      }

      if (!studentId) return setErrorMsg("Pick a learner.");

      const { data, error } = await supabase
        .from("user_books")
        .insert({
          user_id: studentId,
          book_id: bookId,
          status: "reading",
          started_at: new Date().toISOString(),
        })
        .select("id, user_id, book_id, status, current_location, started_at, created_at")
        .single<UserBookRow>();

      if (error) {
        const msg = String(error.message || "").toLowerCase();
        if (msg.includes("duplicate") || msg.includes("unique")) {
          setSuccessMsg("This book is already in that learner’s library.");
          return;
        }
        throw error;
      }

      const chosenStudent = profiles.find((p) => p.id === studentId);
      const chosenBook = books.find((b) => b.id === bookId);

      setSuccessMsg(
        `Added "${chosenBook?.title ?? "Untitled"}" to ${
          chosenStudent ? labelProfile(chosenStudent) : "learner"
        }.\nuser_books.id: ${data.id}`
      );
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Failed to save book task");
    }
  }

  async function removePrepItem(itemId: string) {
    if (!meId) {
      setErrorMsg("Please sign in again.");
      return;
    }

    const ok = window.confirm("Remove this book from your prep shelf?");
    if (!ok) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { error } = await supabase
        .from("teacher_book_prep_items")
        .delete()
        .eq("id", itemId)
        .eq("teacher_id", meId);

      if (error) throw error;

      setPrepItems((prev) => prev.filter((item) => item.id !== itemId));
      setSuccessMsg("Removed the book from your prep shelf.");
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Could not remove this prep shelf item.");
    }
  }

  if (loading) {
    return (
      <main style={{ padding: 24 }}>
        <p>Loading…</p>
      </main>
    );
  }

  if (needsSignIn) {
    return (
      <main style={{ padding: 24 }}>
        <p>You need to sign in first.</p>
      </main>
    );
  }

  if (!canAccess) {
    return (
      <main style={{ padding: 24 }}>
        <p>{errorMsg ?? "Teacher access is required."}</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>Add / Prep a Book</h1>
        <Link
          href="/teacher/students"
          style={{
            border: "1px solid rgba(0,0,0,0.18)",
            borderRadius: 12,
            padding: "8px 12px",
            textDecoration: "none",
            color: "#292524",
            background: "white",
            fontWeight: 750,
          }}
        >
          Back to My Students
        </Link>
      </div>
      <p style={{ marginTop: 8, color: "#57534e", lineHeight: 1.6 }}>
        Add a book directly to an existing learner’s library, or save a book on your
        prep shelf for someone who has not signed up yet.
        {isSuperTeacher
          ? " Super teachers can choose any learner profile."
          : " Regular teachers can choose linked students only."}
      </p>

      {errorMsg ? (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 10,
            border: "1px solid rgba(200,0,0,0.35)",
            background: "rgba(200,0,0,0.06)",
          }}
        >
          <b>Error:</b> {errorMsg}
        </div>
      ) : null}

      {successMsg ? (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 10,
            border: "1px solid rgba(0,140,0,0.35)",
            background: "rgba(0,140,0,0.06)",
            whiteSpace: "pre-wrap",
          }}
        >
          {successMsg}
        </div>
      ) : null}

      <div
        style={{
          marginTop: 18,
          padding: 16,
          borderRadius: 14,
          border: "1px solid rgba(0,0,0,0.12)",
          background: "rgba(255,255,255,0.7)",
          display: "grid",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setActionMode("add_to_library")}
            style={{
              padding: "10px 14px",
              borderRadius: 14,
              border:
                actionMode === "add_to_library"
                  ? "1px solid rgba(20,83,45,0.75)"
                  : "1px solid rgba(0,0,0,0.16)",
              background:
                actionMode === "add_to_library"
                  ? "rgba(220,252,231,0.9)"
                  : "rgba(255,255,255,0.85)",
              fontWeight: 850,
              cursor: "pointer",
            }}
          >
            Add to Learner Library
          </button>

          <button
            type="button"
            onClick={() => setActionMode("prep_future")}
            style={{
              padding: "10px 14px",
              borderRadius: 14,
              border:
                actionMode === "prep_future"
                  ? "1px solid rgba(146,64,14,0.75)"
                  : "1px solid rgba(0,0,0,0.16)",
              background:
                actionMode === "prep_future"
                  ? "rgba(254,243,199,0.9)"
                  : "rgba(255,255,255,0.85)",
              fontWeight: 850,
              cursor: "pointer",
            }}
          >
            Prep for Future Learner
          </button>
        </div>

        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 800 }}>
            {actionMode === "add_to_library" ? "Existing learner" : "Future learner"}
          </div>

          {actionMode === "add_to_library" ? (
            <select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              {selectableProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {labelProfile(p)}
                </option>
              ))}
            </select>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              <input
                value={prospectiveLearnerName}
                onChange={(e) => setProspectiveLearnerName(e.target.value)}
                placeholder="Future learner name"
                style={{
                  border: "1px solid rgba(0,0,0,0.18)",
                  borderRadius: 12,
                  padding: "10px 12px",
                }}
              />
              <input
                value={prospectiveLearnerContact}
                onChange={(e) => setProspectiveLearnerContact(e.target.value)}
                placeholder="Email or note, optional"
                style={{
                  border: "1px solid rgba(0,0,0,0.18)",
                  borderRadius: 12,
                  padding: "10px 12px",
                }}
              />
            </div>
          )}

          <div style={{ opacity: 0.65, fontSize: 12 }}>
            {actionMode === "prep_future"
              ? "This keeps the prep item on your shelf only. You can connect it to a real learner later."
              : "This creates a visible row in the selected learner’s library."}
          </div>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 800 }}>Book</div>
          <input
            value={bookSearch}
            onChange={(e) => setBookSearch(e.target.value)}
            placeholder="Search title, author, ISBN, publisher, or book type"
            style={{
              border: "1px solid rgba(0,0,0,0.18)",
              borderRadius: 12,
              padding: "10px 12px",
            }}
          />
          <select value={bookId} onChange={(e) => setBookId(e.target.value)}>
            {filteredBooks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title ?? "Untitled"}
                {b.author ? ` — ${b.author}` : ""}
              </option>
            ))}
          </select>
          <div style={{ opacity: 0.65, fontSize: 12 }}>
            {filteredBooks.length === books.length
              ? `${books.length} books available.`
              : `${filteredBooks.length} of ${books.length} books match.`}
          </div>
        </label>

        {selectedBook ? (
          <div
            style={{
              border: "1px solid rgba(0,0,0,0.12)",
              borderRadius: 14,
              padding: 14,
              background: "rgba(255,255,255,0.75)",
              display: "flex",
              gap: 14,
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontWeight: 850 }}>Book info helper</div>
              {selectedBookMissingInfo.length > 0 ? (
                <div style={{ marginTop: 4, color: "#92400e", fontSize: 13 }}>
                  Missing: {selectedBookMissingInfo.join(", ")}
                </div>
              ) : (
                <div style={{ marginTop: 4, color: "#166534", fontSize: 13 }}>
                  Core book info looks filled in.
                </div>
              )}
            </div>

            <Link
              href={`/teacher/books/add?bookId=${selectedBook.id}`}
              style={{
                border: "1px solid rgba(0,0,0,0.18)",
                borderRadius: 12,
                padding: "8px 12px",
                textDecoration: "none",
                color: "#292524",
                background: "white",
                fontWeight: 750,
              }}
            >
              Edit book info
            </Link>
          </div>
        ) : null}

        <div
          style={{
            borderRadius: 14,
            border: "1px solid rgba(0,0,0,0.1)",
            padding: 12,
            background:
              actionMode === "add_to_library"
                ? "rgba(240,253,244,0.8)"
                : "rgba(255,251,235,0.85)",
            color: "#44403c",
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          {actionMode === "add_to_library"
            ? "This creates a learner-visible currently reading book. No page or current location is required."
            : "This saves the book to your prep shelf only. No learner library row is created yet."}
        </div>

        <button
          onClick={handlePrimaryAction}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.22)",
            background: "rgba(0,0,0,0.06)",
            fontWeight: 850,
            cursor: "pointer",
          }}
        >
          {actionMode === "add_to_library" ? "Add to Learner Library" : "Add to Prep Shelf"}
        </button>

        <div style={{ opacity: 0.7, fontSize: 13 }}>
          Learning tasks stay separate. After a book is visible in a learner’s library,
          create the learner’s next action from Teacher → Students.
        </div>
      </div>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900 }}>My Prep Shelf</h2>
        <p style={{ marginTop: 6, color: "#57534e", fontSize: 14 }}>
          Books here are not learner-visible yet.
        </p>

        {prepItems.length === 0 ? (
          <div
            style={{
              marginTop: 12,
              border: "1px dashed rgba(0,0,0,0.18)",
              borderRadius: 14,
              padding: 18,
              color: "#78716c",
              background: "rgba(255,255,255,0.55)",
            }}
          >
            No prep books yet.
          </div>
        ) : (
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {prepItems.map((item) => {
              const book = getPrepBook(item.books);
              return (
                <article
                  key={item.id}
                  style={{
                    border: "1px solid rgba(0,0,0,0.12)",
                    borderRadius: 16,
                    padding: 14,
                    background: "rgba(255,255,255,0.8)",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 850 }}>{book?.title ?? "Untitled"}</div>
                    <div style={{ marginTop: 4, color: "#78716c", fontSize: 13 }}>
                      {item.learner_id
                        ? profileNameById.get(item.learner_id) ?? item.learner_id
                        : prospectiveLearnerLabel(item.notes)}{" "}
                      · {item.status}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {book ? (
                      <Link
                        href={`/teacher/books/add?bookId=${book.id}`}
                        style={{
                          border: "1px solid rgba(0,0,0,0.18)",
                          borderRadius: 12,
                          padding: "8px 12px",
                          textDecoration: "none",
                          color: "#292524",
                          background: "white",
                          fontWeight: 750,
                        }}
                      >
                        Edit book info
                      </Link>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => removePrepItem(item.id)}
                      style={{
                        border: "1px solid rgba(185,28,28,0.28)",
                        borderRadius: 12,
                        padding: "8px 12px",
                        color: "#991b1b",
                        background: "rgba(254,242,242,0.9)",
                        fontWeight: 750,
                        cursor: "pointer",
                      }}
                    >
                      Remove from Prep Shelf
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
 
