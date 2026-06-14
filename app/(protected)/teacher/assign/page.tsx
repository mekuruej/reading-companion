// Add / Prep a Book
// 

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { TeacherAssignLoadingState } from "./components/TeacherAssignLoadingState";
import { TeacherAssignSimpleState } from "./components/TeacherAssignSimpleState";
import { TeacherAssignHeader } from "./components/TeacherAssignHeader";
import { TeacherAssignMessageBanner } from "./components/TeacherAssignMessageBanner";
import { TeacherAssignModeToggle } from "./components/TeacherAssignModeToggle";
import { TeacherAssignModeExplanation } from "./components/TeacherAssignModeExplanation";
import { TeacherAssignLearningTasksNote } from "./components/TeacherAssignLearningTasksNote";
import { TeacherAssignPrimaryActionButton } from "./components/TeacherAssignPrimaryActionButton";
import { TeacherPrepShelfEmptyState } from "./components/TeacherPrepShelfEmptyState";
import { TeacherAssignFormCard } from "./components/TeacherAssignFormCard";
import { TeacherPrepShelfHeader } from "./components/TeacherPrepShelfHeader";
import { TeacherAssignLearnerFields } from "./components/TeacherAssignLearnerFields";
import { TeacherAssignBookPicker } from "./components/TeacherAssignBookPicker";
import { TeacherAssignSelectedBookHelper } from "./components/TeacherAssignSelectedBookHelper";
import { TeacherPrepShelfItemCard } from "./components/TeacherPrepShelfItemCard";
import { TeacherPrepShelfSection } from "./components/TeacherPrepShelfSection";

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
            .eq("teacher_id", authUser.id)
            .is("archived_at", null);

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
        `Added "${chosenBook?.title ?? "Untitled"}" to ${chosenStudent ? labelProfile(chosenStudent) : "learner"
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
    return <TeacherAssignLoadingState />;
  }

  if (needsSignIn) {
    return <TeacherAssignSimpleState message="You need to sign in first." />;
  }

  if (!canAccess) {
    return (
      <TeacherAssignSimpleState
        message={errorMsg ?? "Teacher access is required."}
      />
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
      <TeacherAssignHeader isSuperTeacher={isSuperTeacher} />

      <TeacherAssignMessageBanner
        errorMsg={errorMsg}
        successMsg={successMsg}
      />

      <TeacherAssignFormCard>
        <TeacherAssignModeToggle
          actionMode={actionMode}
          onChangeMode={setActionMode}
        />

        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 800 }}>
            {actionMode === "add_to_library" ? "Existing learner" : "Future learner"}
          </div>

          <TeacherAssignLearnerFields
            actionMode={actionMode}
            studentId={studentId}
            profiles={selectableProfiles}
            prospectiveLearnerName={prospectiveLearnerName}
            prospectiveLearnerContact={prospectiveLearnerContact}
            labelProfile={labelProfile}
            onStudentChange={setStudentId}
            onProspectiveLearnerNameChange={setProspectiveLearnerName}
            onProspectiveLearnerContactChange={setProspectiveLearnerContact}
          />
          <div style={{ opacity: 0.65, fontSize: 12 }}>
            {actionMode === "prep_future"
              ? "This keeps the prep item on your shelf only. You can connect it to a real learner later."
              : "This creates a visible row in the selected learner’s library."}
          </div>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 800 }}>Book</div>
          <TeacherAssignBookPicker
            bookSearch={bookSearch}
            bookId={bookId}
            booksCount={books.length}
            filteredBooks={filteredBooks}
            onBookSearchChange={setBookSearch}
            onBookChange={setBookId}
          />
        </label>

        <TeacherAssignSelectedBookHelper
          selectedBook={selectedBook}
          missingInfo={selectedBookMissingInfo}
        />

        <TeacherAssignModeExplanation actionMode={actionMode} />

        <TeacherAssignPrimaryActionButton
          actionMode={actionMode}
          onPrimaryAction={handlePrimaryAction}
        />

        <TeacherAssignLearningTasksNote />
      </TeacherAssignFormCard>

      <section style={{ marginTop: 24 }}>
        <TeacherPrepShelfSection>
          {prepItems.length === 0 ? (
            <TeacherPrepShelfEmptyState />
          ) : (
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {prepItems.map((item) => {
                const book = getPrepBook(item.books);

                return (
                  <TeacherPrepShelfItemCard
                    key={item.id}
                    itemId={item.id}
                    book={book}
                    learnerLabel={
                      item.learner_id
                        ? profileNameById.get(item.learner_id) ?? item.learner_id
                        : prospectiveLearnerLabel(item.notes)
                    }
                    status={item.status}
                    onRemove={removePrepItem}
                  />
                );
              })}
            </div>
          )}
        </TeacherPrepShelfSection>
      </section>
    </main>
  );
}

