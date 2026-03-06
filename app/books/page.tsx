"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type Book = {
  id: string;
  title: string;
  author: string | null;
  translator: string | null;
  illustrator: string | null;
  publisher: string | null;
  isbn13: string | null;
  cover_url: string | null;
  book_key?: string | null;
};

type UserBookRow = {
  id: string; // user_books.id (aka userBookId)
  book_id: string;
  started_at: string | null;
  finished_at: string | null;
  books: Book | null; // joined book
};

type StudentOption = {
  id: string; // profile/user id
  display_name: string;
  level?: string | null;
};

function UserBar() {
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

      if (profErr) console.warn("UserBar: could not load profile display_name:", profErr);

      setLabel(prof?.display_name || "Student");
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => loadUser());

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (!label) return null;

  return (
    <div className="flex justify-between items-center mb-4 text-sm text-gray-700">
      <span>Logged in as: {label}</span>
      <button onClick={handleLogout} className="border px-2 py-1 rounded-md hover:bg-gray-100">
        Log out
      </button>
    </div>
  );
}

export default function BooksPage() {
  const [rows, setRows] = useState<UserBookRow[]>([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [adding, setAdding] = useState(false);

  // form fields
  const [isbn13, setIsbn13] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [publisher, setPublisher] = useState("");
  const [translator, setTranslator] = useState("");
  const [illustrator, setIllustrator] = useState("");
  const [coverUrl, setCoverUrl] = useState("");

  const [finishingUserBookId, setFinishingUserBookId] = useState<string | null>(null);
  const [finishDate, setFinishDate] = useState("");

  const [startingUserBookId, setStartingUserBookId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");

  const [message, setMessage] = useState<string>("");
  const [messageType, setMessageType] = useState<"error" | "success" | "">("");

  const [meId, setMeId] = useState<string>("");
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [viewingUserId, setViewingUserId] = useState<string>("");

  const viewingLabel =
    viewingUserId && viewingUserId === meId
      ? "Me"
      : students.find((s) => s.id === viewingUserId)?.display_name || "Student";

  function digitsOnly(s: string) {
    return (s ?? "").replace(/[^0-9]/g, "").trim();
  }

  function normKey(s: string) {
    return (s ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");
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

    const { data, error } = await supabase
      .from("user_books")
      .select(
        `
        id,
        book_id,
        started_at,
        finished_at,
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
      .eq("user_id", userIdToView)
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

  // Load auth + students list
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
      setViewingUserId((prev) => prev || user.id);

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
        .select("id, display_name, level")
        .in("id", studentIds)
        .order("display_name", { ascending: true });

      if (profErr) {
        logSbError("Error loading student profiles:", profErr);
        if (!cancelled) setStudents([]);
        return;
      }

      if (cancelled) return;

      setStudents(
        (profs ?? []).map((p: any) => ({
          id: p.id,
          display_name: p.display_name,
          level: p.level ?? null,
        }))
      );
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch books whenever viewingUserId changes
  useEffect(() => {
    if (!viewingUserId) return;
    fetchBooks(viewingUserId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewingUserId]);

  async function addBook(e: React.FormEvent) {
    e.preventDefault();
    if (adding) return;

    setAdding(true);
    setMessage("");
    setMessageType("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setMessage("Please sign in before adding a book.");
        setMessageType("error");
        return;
      }

      if (!viewingUserId) {
        setMessage("Select a student (or Me) first.");
        setMessageType("error");
        return;
      }

      if (!title.trim()) {
        setMessage("Title is required.");
        setMessageType("error");
        return;
      }

      const cleanIsbn13 = digitsOnly(isbn13);
      const book_key = [normKey(title), normKey(author), normKey(publisher)].join("|");

      let bookIdToUse: string | null = null;

      // 1) Prefer ISBN-13 match if provided
      if (cleanIsbn13) {
        const { data: existingByIsbn, error: findErr } = await supabase
          .from("books")
          .select("id")
          .eq("isbn13", cleanIsbn13)
          .maybeSingle();

        if (findErr) {
          logSbError("Find by isbn13 error:", findErr);
          setMessage(`Error searching books by ISBN: ${findErr?.message || "Unknown"}`);
          setMessageType("error");
          return;
        }

        bookIdToUse = (existingByIsbn as any)?.id ?? null;
      }

      // 2) Fallback: match by book_key
      if (!bookIdToUse) {
        const { data: existingByKey, error: keyErr } = await supabase
          .from("books")
          .select("id")
          .eq("book_key", book_key)
          .maybeSingle();

        if (keyErr) {
          logSbError("Find by book_key error:", keyErr);
          setMessage(`Error searching books by key: ${keyErr?.message || "Unknown"}`);
          setMessageType("error");
          return;
        }

        bookIdToUse = (existingByKey as any)?.id ?? null;
      }

      // 3) Insert if missing
      if (!bookIdToUse) {
        const baseInsert = {
          title: title.trim(),
          author: author.trim() || null,
          translator: translator.trim() || null,
          illustrator: illustrator.trim() || null,
          publisher: publisher.trim() || null,
          isbn13: cleanIsbn13 || null,
          book_key,
          cover_url: coverUrl.trim() || null,
        };

        // shared insert first
        const { data: createdA, error: errA } = await supabase
          .from("books")
          .insert([baseInsert])
          .select("id")
          .maybeSingle();

        if (errA) {
          // fallback insert with user_id (compat with current RLS)
          const { data: createdB, error: errB } = await supabase
            .from("books")
            .insert([{ ...baseInsert, user_id: user.id } as any])
            .select("id")
            .maybeSingle();

          if (errB) {
            logSbError("books insert error:", errB);
            setMessage(`Error adding book: ${errB?.message || errA?.message || "Unknown"}`);
            setMessageType("error");
            return;
          }

          bookIdToUse = (createdB as any)?.id ?? null;
        } else {
          bookIdToUse = (createdA as any)?.id ?? null;
        }

        if (!bookIdToUse) {
          setMessage("Error adding book: insert returned no id.");
          setMessageType("error");
          return;
        }
      }

      // 4) Create user_books assignment
      const { error: ubErr } = await supabase.from("user_books").insert([
        {
          user_id: viewingUserId,
          book_id: bookIdToUse,
          started_at: null,
          finished_at: null,
        },
      ]);

      if (ubErr) {
        logSbError("user_books insert error:", ubErr);
        setMessage(`Book added, but failed to assign: ${ubErr?.message || "Unknown"}`);
        setMessageType("error");
        return;
      }

      // Reset form
      setIsbn13("");
      setTitle("");
      setAuthor("");
      setPublisher("");
      setTranslator("");
      setIllustrator("");
      setCoverUrl("");

      await fetchBooks(viewingUserId);

      setMessage(`✅ Book added for ${viewingLabel}.`);
      setMessageType("success");
      setShowAddModal(false);
    } finally {
      setAdding(false);
    }
  }

  async function saveStartedDate(userBookId: string) {
    if (!startDate) return;

    const { error } = await supabase.from("user_books").update({ started_at: startDate }).eq("id", userBookId);

    if (error) {
      logSbError("Error saving started date:", error);
      setMessage("Error saving start date.");
      setMessageType("error");
      return;
    }

    setStartingUserBookId(null);
    setStartDate("");
    fetchBooks(viewingUserId);
  }

  async function saveFinishedDate(userBookId: string) {
    if (!finishDate) return;

    const { error } = await supabase.from("user_books").update({ finished_at: finishDate }).eq("id", userBookId);

    if (error) {
      logSbError("Error saving finish date:", error);
      setMessage("Error saving finish date.");
      setMessageType("error");
      return;
    }

    setFinishingUserBookId(null);
    setFinishDate("");
    fetchBooks(viewingUserId);
  }

  // Sections
  const validRows = rows.filter((r) => !!r.books);

  const currentlyReading = validRows.filter((r) => !!r.started_at && !r.finished_at);
  const notStarted = validRows.filter((r) => !r.started_at && !r.finished_at);
  const finished = validRows.filter((r) => !!r.finished_at);

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
            {subtitle ? <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p> : null}
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
        className="flex flex-col items-center p-2 rounded-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-200/40 cursor-pointer"
      >
        <a href={`/books/${row.id}`} onClick={(e) => e.stopPropagation()} className="block">
          {book.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={book.cover_url} alt={`${book.title} cover`} className="w-32 h-48 object-cover rounded-md shadow-md" />
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
        {book.translator && <span className="text-gray-500 text-xs">訳：{book.translator}</span>}
        {book.illustrator && <span className="text-gray-500 text-xs">絵：{book.illustrator}</span>}

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
          ) : (
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
          )}

          {row.finished_at ? (
            <div>Finished: {new Date(row.finished_at).toLocaleDateString()}</div>
          ) : (
            <>
              {finishingUserBookId === row.id ? (
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
              ) : (
                row.started_at && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFinishingUserBookId(row.id);
                      setFinishDate(new Date().toISOString().split("T")[0]);
                    }}
                    className="mt-1 text-[11px] text-blue-600 underline hover:text-blue-800"
                  >
                    Mark as Finished
                  </button>
                )
              )}
            </>
          )}
        </div>

        <a
          href={`/books/${row.id}/study`}
          onClick={(e) => e.stopPropagation()}
          className="mt-2 text-[12px] px-3 py-1 bg-green-700 text-white rounded hover:bg-amber-600 transition"
        >
          Study
        </a>

        <a
          href={`/books/${row.id}/words`}
          onClick={(e) => e.stopPropagation()}
          className="mt-1 text-[12px] px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-800 transition"
        >
          View Vocab List
        </a>

        <a
          href={`/vocab/bulk?userBookId=${row.id}`}
          onClick={(e) => e.stopPropagation()}
          className="mt-1 text-[12px] px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        >
          Add Vocab
        </a>
      </li>
    );
  }

  return (
    <main
      className="min-h-screen p-8"
      style={{
        backgroundImage: `
          repeating-linear-gradient(
            to bottom,
            #f9f6ef 0px,
            #f9f6ef 180px,
            #d1b58f 181px,
            #d1b58f 183px
          ),
          linear-gradient(to right, #f8f3e8 0%, #f3ede2 100%)
        `,
        backgroundSize: "100% 183px",
      }}
    >
      <h1 className="text-2xl font-semibold mb-2">📚 Books</h1>

      <UserBar />

      <div className="mb-4 flex flex-col gap-2">
        <div className="text-sm text-gray-700">
          Viewing: <span className="font-medium">{viewingLabel}</span>
        </div>

        <select
          value={viewingUserId || meId}
          onChange={(e) => setViewingUserId(e.target.value)}
          className="border p-2 rounded w-full bg-white"
          disabled={!meId}
        >
          <option value={meId}>Me</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.display_name}
              {s.level ? ` (${s.level})` : ""}
            </option>
          ))}
        </select>

        <p className="text-xs text-gray-500">Tip: Enter ISBN-13 first to prevent duplicates.</p>
      </div>

      {message ? (
        <p className={`mb-4 text-sm ${messageType === "error" ? "text-red-600" : "text-green-700"}`}>{message}</p>
      ) : null}

      <Section title="Currently Reading" subtitle="Started but not finished yet" items={currentlyReading} />
      <Section title="Want to Read" subtitle="Not started yet" items={notStarted} />
      <Section title="Finished" subtitle="Completed books" items={finished} />

      {validRows.length === 0 ? (
        <div className="text-sm text-gray-600 mt-8">No books yet — click “+ Add Book” to start.</div>
      ) : null}

      <button
        type="button"
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-6 right-6 z-40 rounded-full bg-blue-600 text-white px-5 py-3 shadow-lg hover:bg-blue-700"
        title={`Add a book for: ${viewingLabel}`}
      >
        + Add Book (Not Working)
      </button>

      {showAddModal ? (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white border shadow-xl p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h2 className="text-lg font-semibold">Add a book</h2>
                <p className="text-sm text-gray-600">
                  For: <span className="font-medium">{viewingLabel}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300 text-sm"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={addBook} className="flex flex-col gap-3">
              {/* ✅ ISBN first */}
              <input
                type="text"
                placeholder="ISBN-13 (recommended, digits only)"
                value={isbn13}
                onChange={(e) => setIsbn13(e.target.value)}
                className="border p-2 rounded"
              />

              <input
                type="text"
                placeholder="Book title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border p-2 rounded"
                required
              />

              <input
                type="text"
                placeholder="Author (optional)"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="border p-2 rounded"
              />

              <input
                type="text"
                placeholder="Publisher (optional)"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                className="border p-2 rounded"
              />

              <input
                type="text"
                placeholder="Translator (optional)"
                value={translator}
                onChange={(e) => setTranslator(e.target.value)}
                className="border p-2 rounded"
              />

              <input
                type="text"
                placeholder="Illustrator (optional)"
                value={illustrator}
                onChange={(e) => setIllustrator(e.target.value)}
                className="border p-2 rounded"
              />

              <input
                type="text"
                placeholder="Cover image URL (optional)"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                className="border p-2 rounded"
              />

              <button
                type="submit"
                disabled={adding}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {adding ? "Adding..." : "Add"}
              </button>

              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}