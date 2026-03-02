"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type ProfileRow = {
  id: string;
  display_name: string | null;
  level: string | null; // "beginner" | "intermediate" | "advanced" etc
  is_public: boolean | null;
  created_at: string | null;
};

type BookRow = {
  id: string;
  title: string | null;
  author: string | null;
  cover_url: string | null;
};

type UserBookRow = {
  id: string;
  user_id: string;
  book_id: string;
  status: string | null;
  current_location: string | null;
  created_at: string | null;
};

function labelProfile(p: ProfileRow) {
  const name = (p.display_name ?? "").trim();
  const lvl = (p.level ?? "").trim();
  if (name && lvl) return `${name} (${lvl})`;
  if (name) return name;
  if (lvl) return `${p.id} (${lvl})`;
  return p.id;
}

export default function AssignBookPage() {
  const [loading, setLoading] = useState(true);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [meId, setMeId] = useState<string | null>(null);

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [books, setBooks] = useState<BookRow[]>([]);

  const [studentId, setStudentId] = useState<string>("");
  const [bookId, setBookId] = useState<string>("");

  const [status, setStatus] = useState<string>("reading");
  const [currentLocation, setCurrentLocation] = useState<string>("");

  const selectableProfiles = useMemo(() => {
    // For now: everyone except me
    return profiles.filter((p) => p.id !== meId);
  }, [profiles, meId]);

  useEffect(() => {
    // If studentId is empty OR no longer exists in options, set a valid default.
    if (selectableProfiles.length === 0) return;

    const stillValid = selectableProfiles.some((p) => p.id === studentId);
    if (!studentId || !stillValid) {
      setStudentId(selectableProfiles[0].id);
    }
  }, [selectableProfiles, studentId]);

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

        // Load profiles (your schema)
        const { data: profileRows, error: pErr } = await supabase
          .from("profiles")
          .select("id, display_name, level, is_public, created_at")
          .order("display_name", { ascending: true });

        if (pErr) throw pErr;

        const pList = (profileRows ?? []) as ProfileRow[];
        setProfiles(pList);

        // Load books
        const { data: bookRows, error: bErr } = await supabase
          .from("books")
          .select("id, title, author, cover_url")
          .order("title", { ascending: true });

        if (bErr) throw bErr;

        const bList = (bookRows ?? []) as BookRow[];
        setBooks(bList);

        // Default selections
        const firstStudent = pList.find((p) => p.id !== authUser.id);
        if (firstStudent) setStudentId(firstStudent.id);
        if (bList.length > 0) setBookId(bList[0].id);
      } catch (e: any) {
        setErrorMsg(e?.message ?? "Failed to load assign page");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  async function assign() {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!studentId) return setErrorMsg("Pick a student.");
    if (!bookId) return setErrorMsg("Pick a book.");

    try {
      const payload = {
        user_id: studentId,
        book_id: bookId,
        status,
        current_location: currentLocation || null,
      };

      const { data, error } = await supabase
        .from("user_books")
        .insert(payload)
        .select("id, user_id, book_id, status, current_location, created_at")
        .single<UserBookRow>();

      if (error) {
        const msg = String(error.message || "").toLowerCase();
        if (msg.includes("duplicate") || msg.includes("unique")) {
          setSuccessMsg("Already assigned (no changes).");
          return;
        }
        throw error;
      }

      const chosenStudent = profiles.find((p) => p.id === studentId);
      const chosenBook = books.find((b) => b.id === bookId);

      setSuccessMsg(
        `Assigned "${chosenBook?.title ?? "Untitled"}" to ${
          chosenStudent ? labelProfile(chosenStudent) : "student"
        }.\nuser_books.id: ${data.id}`
      );
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Failed to assign book");
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

  return (
    <main style={{ padding: 24, maxWidth: 920, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 900 }}>Assign Book</h1>

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
        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 800 }}>Student</div>
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            {selectableProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {labelProfile(p)}
              </option>
            ))}
          </select>
          <div style={{ opacity: 0.65, fontSize: 12 }}>
            (For now this lists all profiles except you — we can add “teacher/student” roles later.)
          </div>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 800 }}>Book</div>
          <select value={bookId} onChange={(e) => setBookId(e.target.value)}>
            {books.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title ?? "Untitled"}
                {b.author ? ` — ${b.author}` : ""}
              </option>
            ))}
          </select>
        </label>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 800 }}>Status</div>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="reading">Reading</option>
              <option value="finished">Finished</option>
              <option value="did_not_finish">Did not finish</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 800 }}>Current location (optional)</div>
            <input
              value={currentLocation}
              onChange={(e) => setCurrentLocation(e.target.value)}
              placeholder='e.g. "p.45" or "ch.3"'
            />
          </label>
        </div>

        <button
          onClick={assign}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(0,0,0,0.22)",
            background: "rgba(0,0,0,0.06)",
            fontWeight: 850,
            cursor: "pointer",
          }}
        >
          Assign
        </button>

        <div style={{ opacity: 0.7, fontSize: 13 }}>
          This creates a row in <code>user_books</code>. The resulting <code>user_books.id</code> is
          what your Study route uses.
        </div>
      </div>
    </main>
  );
}
 