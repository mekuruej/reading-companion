// Vocab Hub
"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type WordRow = {
  id: string;
  user_book_id: string;
  surface: string;
  reading: string | null;
  meaning: string | null;
  other_definition: string | null;
  jlpt: string | null;
  is_common: boolean | null;
  page_number: number | null;
  page_order: number | null;
  chapter_number: number | null;
  chapter_name: string | null;
  seen_on: string | null;
  created_at: string;
  hidden: boolean | null;
  meaning_choices: any | null;
  meaning_choice_index: number | null;
};

type ProfileRole = "teacher" | "student";

function normalizeJlpt(val: string | null | undefined) {
  const v = (val ?? "").toUpperCase();
  if (v === "N1" || v === "N2" || v === "N3" || v === "N4" || v === "N5") return v;
  return "NON-JLPT";
}

function chapterDisplayParts(w: WordRow) {
  const num = w.chapter_number;
  const name = (w.chapter_name ?? "").trim();

  return {
    num: num != null ? `Chapter ${num}:` : "",
    name,
    fallback:
      num != null && name
        ? `Chapter ${num}: ${name}`
        : num != null
          ? `Chapter ${num}`
          : name
            ? name
            : "(none)",
  };
}

function chapterKey(w: WordRow) {
  const num = w.chapter_number != null ? String(w.chapter_number) : "";
  const name = (w.chapter_name ?? "").trim();
  return `${num}||${name}`;
}

function asStringArray(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map((x) => String(x)).filter(Boolean);
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.map((x) => String(x)).filter(Boolean);
    } catch { }
  }
  return [];
}

function normalizeText(val: string | null | undefined) {
  return (val ?? "").trim();
}

function repeatKey(w: WordRow) {
  const s = normalizeText(w.surface);
  if (!s) return "";

  const choices = asStringArray((w as any).meaning_choices);
  const idx = w.meaning_choice_index;

  if (choices.length > 0 && idx != null && Number.isFinite(idx)) {
    return `${s}||IDX:${idx}`;
  }

  const m = normalizeText(w.meaning);
  return `${s}||MEAN:${m}`;
}

export default function BookWordsPage() {
  const params = useParams<{ userBookId: string }>();
  const userBookId = params.userBookId;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [myRole, setMyRole] = useState<ProfileRole>("student");
  const isTeacher = myRole === "teacher";

  const [bookTitle, setBookTitle] = useState("");
  const [bookCover, setBookCover] = useState("");

  const [words, setWords] = useState<WordRow[]>([]);
  const [query, setQuery] = useState("");
  const [chapterFilter, setChapterFilter] = useState("all");
  const [chapterOptions, setChapterOptions] = useState<{ value: string; label: string }[]>([]);
  const [showHidden, setShowHidden] = useState(false);

  const [editing, setEditing] = useState<WordRow | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editErr, setEditErr] = useState<string | null>(null);

  const [editSurface, setEditSurface] = useState("");
  const [editReading, setEditReading] = useState("");
  const [editMeaning, setEditMeaning] = useState("");
  const [editOtherDefinition, setEditOtherDefinition] = useState("");
  const [editJlpt, setEditJlpt] = useState("");
  const [editPage, setEditPage] = useState<string>("");
  const [editChapterNum, setEditChapterNum] = useState<string>("");
  const [editChapterName, setEditChapterName] = useState("");

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  const [editMeaningChoices, setEditMeaningChoices] = useState<string[]>([]);
  const [editMeaningChoiceIndex, setEditMeaningChoiceIndex] = useState<number | null>(0);

  const stickyControlsRef = useRef<HTMLDivElement | null>(null);
  const [stickyOffset, setStickyOffset] = useState(0);

  useLayoutEffect(() => {
    function measure() {
      if (!stickyControlsRef.current) return;
      setStickyOffset(stickyControlsRef.current.offsetHeight);
    }

    measure();

    const el = stickyControlsRef.current;
    if (!el) return;

    let ro: ResizeObserver | null = null;

    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => measure());
      ro.observe(el);
    }

    window.addEventListener("resize", measure);

    return () => {
      window.removeEventListener("resize", measure);
      if (ro) ro.disconnect();
    };
  }, []);

  function sameOrderGroup(a: WordRow, b: WordRow) {
    return (
      (a.chapter_number ?? null) === (b.chapter_number ?? null) &&
      (a.chapter_name ?? "").trim() === (b.chapter_name ?? "").trim() &&
      (a.page_number ?? null) === (b.page_number ?? null)
    );
  }

  function sortWithinGroup(list: WordRow[]) {
    return [...list].sort((a, b) => {
      const aOrder = a.page_order ?? Number.MAX_SAFE_INTEGER;
      const bOrder = b.page_order ?? Number.MAX_SAFE_INTEGER;

      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.created_at.localeCompare(b.created_at);
    });
  }

  async function moveWordInGroup(draggedId: string, targetId: string) {
    if (draggedId === targetId) return;

    const dragged = words.find((w) => w.id === draggedId);
    const target = words.find((w) => w.id === targetId);

    if (!dragged || !target) return;
    if (!sameOrderGroup(dragged, target)) return;

    const group = sortWithinGroup(words.filter((w) => sameOrderGroup(w, dragged)));

    const fromIndex = group.findIndex((w) => w.id === draggedId);
    const toIndex = group.findIndex((w) => w.id === targetId);

    if (fromIndex === -1 || toIndex === -1) return;

    const reordered = [...group];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    const updatedGroup = reordered.map((w, index) => ({
      ...w,
      page_order: index + 1,
    }));

    setWords((prev) =>
      prev.map((word) => {
        const updated = updatedGroup.find((w) => w.id === word.id);
        return updated ?? word;
      })
    );

    setReordering(true);

    try {
      for (const w of updatedGroup) {
        const { error } = await supabase
          .from("user_book_words")
          .update({ page_order: w.page_order })
          .eq("id", w.id)
          .eq("user_book_id", userBookId);

        if (error) throw error;
      }
    } catch (error: any) {
      console.error("Failed to save reorder:", error);
      alert(error?.message || "Failed to save new order.");
    } finally {
      setReordering(false);
    }
  }

  function openEdit(w: WordRow) {
    setEditErr(null);
    setEditing(w);

    setEditSurface(w.surface ?? "");
    setEditReading(w.reading ?? "");
    setEditMeaning(w.meaning ?? "");
    setEditOtherDefinition(w.other_definition ?? "");
    setEditJlpt(w.jlpt ?? "");

    setEditPage(w.page_number != null ? String(w.page_number) : "");
    setEditChapterNum(w.chapter_number != null ? String(w.chapter_number) : "");
    setEditChapterName(w.chapter_name ?? "");

    const choices = asStringArray(w.meaning_choices);
    const rawIdx =
      w.meaning_choice_index == null
        ? null
        : Number.isFinite(w.meaning_choice_index as any)
          ? (w.meaning_choice_index as number)
          : 0;

    const idx =
      rawIdx == null
        ? null
        : Math.max(0, choices.length ? Math.min(rawIdx, choices.length - 1) : rawIdx);

    setEditMeaningChoices(choices);
    setEditMeaningChoiceIndex(idx);

    if (idx != null && choices.length && choices[idx]) {
      setEditMeaning(choices[idx]);
    } else {
      setEditMeaning(w.meaning ?? "");
    }
  }

  function closeEdit() {
    setEditing(null);
    setEditErr(null);
    setEditSaving(false);
  }

  function parseNullableInt(s: string): number | null {
    const t = (s ?? "").trim();
    if (!t) return null;
    const n = Number(t);
    if (!Number.isFinite(n)) return null;
    return Math.trunc(n);
  }

  function changeDefinition(newValue: string) {
    const choices = editMeaningChoices ?? [];

    if (newValue === "other") {
      setEditMeaningChoiceIndex(null);
      setEditMeaning("");
      return;
    }

    const newIndex = Number(newValue);
    const safe = Math.max(0, newIndex);

    setEditMeaningChoiceIndex(safe);

    if (choices.length) {
      const clamped = Math.min(safe, choices.length - 1);
      const chosen = choices[clamped] ?? "";
      setEditMeaning(chosen);
    }
  }

  async function saveEdit() {
    if (!editing) return;

    setEditSaving(true);
    setEditErr(null);

    const hasChoices = (editMeaningChoices?.length ?? 0) > 0;

    const patch: any = {
      surface: editSurface.trim(),
      reading: editReading.trim() ? editReading.trim() : null,
      meaning: editMeaning.trim() ? editMeaning.trim() : null,
      other_definition: null,
      jlpt: editJlpt.trim() ? editJlpt.trim().toUpperCase() : null,
      page_number: parseNullableInt(editPage),
      chapter_number: parseNullableInt(editChapterNum),
      chapter_name: editChapterName.trim() ? editChapterName.trim() : null,
    };

    if (editMeaningChoiceIndex == null) {
      // manual override → user typed their own meaning
      patch.meaning_choices = null;
      patch.meaning_choice_index = null;
    } else {
      patch.meaning_choice_index = editMeaningChoiceIndex;
    }

    if (hasChoices && editMeaningChoiceIndex != null) {
      const chosen = editMeaningChoices[editMeaningChoiceIndex] ?? "";
      if (chosen) patch.meaning = chosen;
    }

    try {
      const { error } = await supabase
        .from("user_book_words")
        .update(patch)
        .eq("id", editing.id)
        .eq("user_book_id", userBookId);

      if (error) throw error;

      setWords((prev) =>
        prev.map((w) =>
          w.id === editing.id
            ? ({
              ...w,
              ...patch,
            } as WordRow)
            : w
        )
      );

      closeEdit();
    } catch (e: any) {
      setEditErr(e?.message ?? "Failed to save changes");
    } finally {
      setEditSaving(false);
    }
  }

  async function deleteWord(w: WordRow) {
    const ok = window.confirm(`Delete "${w.surface}"? This cannot be undone.`);
    if (!ok) return;

    try {
      const { error } = await supabase
        .from("user_book_words")
        .delete()
        .eq("id", w.id)
        .eq("user_book_id", userBookId);

      if (error) throw error;
      setWords((prev) => prev.filter((x) => x.id !== w.id));
    } catch (e: any) {
      alert(e?.message ?? "Failed to delete word");
    }
  }

  async function hideWord(w: WordRow) {
    try {
      const { error } = await supabase
        .from("user_book_words")
        .update({ hidden: true })
        .eq("id", w.id)
        .eq("user_book_id", userBookId);

      if (error) throw error;

      if (showHidden) {
        setWords((prev) => prev.map((x) => (x.id === w.id ? { ...x, hidden: true } : x)));
      } else {
        setWords((prev) => prev.filter((x) => x.id !== w.id));
      }
    } catch (e: any) {
      alert(e?.message ?? "Failed to hide word");
    }
  }

  async function unhideWord(w: WordRow) {
    try {
      const { error } = await supabase
        .from("user_book_words")
        .update({ hidden: false })
        .eq("id", w.id)
        .eq("user_book_id", userBookId);

      if (error) throw error;

      setWords((prev) => prev.map((x) => (x.id === w.id ? { ...x, hidden: false } : x)));
    } catch (e: any) {
      alert(e?.message ?? "Failed to unhide word");
    }
  }

  useEffect(() => {
    if (!userBookId) return;

    async function load() {
      setLoading(true);
      setErrorMsg(null);
      setNeedsSignIn(false);

      try {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth?.user;

        if (!user) {
          setNeedsSignIn(true);
          setLoading(false);
          return;
        }

        const { data: meProfile, error: meProfileErr } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (meProfileErr) {
          console.error("Error loading profile role:", meProfileErr);
        }

        setMyRole((meProfile?.role as ProfileRole | null) ?? "student");

        const { data: ub, error: ubErr } = await supabase
          .from("user_books")
          .select(
            `
            id,
            books:book_id (
              title,
              cover_url
            )
          `
          )
          .eq("id", userBookId)
          .single();

        if (ubErr) throw ubErr;

        setBookTitle((ub as any)?.books?.title ?? "");
        setBookCover((ub as any)?.books?.cover_url ?? "");

        let wordsQuery = supabase
          .from("user_book_words")
          .select(
            `
            id,
            user_book_id,
            surface,
            reading,
            meaning,
            other_definition,
            jlpt,
            is_common,
            page_number,
            page_order,
            chapter_number,
            chapter_name,
            seen_on,
            created_at,
            hidden,
            meaning_choices,
            meaning_choice_index
          `
          )
          .eq("user_book_id", userBookId)
          .order("chapter_number", { ascending: true, nullsFirst: false })
          .order("page_number", { ascending: true, nullsFirst: false })
          .order("page_order", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: true })
          .order("id", { ascending: true });

        if (showHidden) {
          wordsQuery = wordsQuery.eq("hidden", true);
        } else {
          wordsQuery = wordsQuery.eq("hidden", false);
        }

        const { data: rows, error: wErr } = await wordsQuery.returns<WordRow[]>();

        if (wErr) throw wErr;

        const list = rows ?? [];
        setWords(list);

        const optMap = new Map<string, string>();
        for (const w of list) {
          optMap.set(chapterKey(w), chapterDisplayParts(w).fallback);
        }

        const opts = Array.from(optMap.entries()).map(([value, label]) => ({ value, label }));

        opts.sort((a, b) => {
          const anum = a.label.match(/Chapter\s+(\d+)/i)?.[1];
          const bnum = b.label.match(/Chapter\s+(\d+)/i)?.[1];
          if (anum && bnum) return Number(anum) - Number(bnum);
          return a.label.localeCompare(b.label);
        });

        setChapterOptions(opts);
      } catch (e: any) {
        setErrorMsg(e?.message ?? "Failed to load words");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [userBookId, showHidden]);

  const repeatCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const w of words) {
      const key = repeatKey(w);
      if (!key) continue;
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return m;
  }, [words]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return words.filter((w) => {
      const chValue = chapterKey(w);
      const chLabel = chapterDisplayParts(w).fallback;

      if (chapterFilter !== "all" && chValue !== chapterFilter) return false;
      if (!q) return true;

      const hay = [
        w.surface,
        w.reading ?? "",
        w.meaning ?? "",
        normalizeJlpt(w.jlpt),
        chLabel,
        w.page_number?.toString() ?? "",
        w.meaning_choice_index != null ? String(w.meaning_choice_index + 1) : "o",
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [words, query, chapterFilter]);

  const filteredSorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aChapter = a.chapter_number ?? Number.MAX_SAFE_INTEGER;
      const bChapter = b.chapter_number ?? Number.MAX_SAFE_INTEGER;
      if (aChapter !== bChapter) return aChapter - bChapter;

      const aPage = a.page_number ?? Number.MAX_SAFE_INTEGER;
      const bPage = b.page_number ?? Number.MAX_SAFE_INTEGER;
      if (aPage !== bPage) return aPage - bPage;

      const aOrder = a.page_order ?? Number.MAX_SAFE_INTEGER;
      const bOrder = b.page_order ?? Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) return aOrder - bOrder;

      const created = a.created_at.localeCompare(b.created_at);
      if (created !== 0) return created;

      return a.id.localeCompare(b.id);
    });
  }, [filtered]);

  const headerStickyStyle = { top: "0px" };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading words…</p>
      </main>
    );
  }

  if (needsSignIn) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-gray-700">You need to sign in.</p>
        <button onClick={() => router.push("/login")} className="px-4 py-2 bg-gray-200 rounded">
          Go to Login
        </button>
      </main>
    );
  }

  if (errorMsg) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-red-700">{errorMsg}</p>
        <button onClick={() => router.push("/books")} className="px-4 py-2 bg-gray-200 rounded">
          Back to Books
        </button>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto p-6 pb-24">
      {editing && isTeacher ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Edit word</h2>
                <p className="text-xs text-gray-500 mt-1">
                  {editing.surface} • {editing.id}
                </p>
              </div>
              <button
                onClick={closeEdit}
                className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300 text-sm"
              >
                ✕ Close
              </button>
            </div>

            {editErr ? <p className="mt-3 text-sm text-red-700">{editErr}</p> : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">Word</span>
                <input
                  value={editSurface}
                  onChange={(e) => setEditSurface(e.target.value)}
                  className="border p-2 rounded"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">Reading</span>
                <input
                  value={editReading}
                  onChange={(e) => setEditReading(e.target.value)}
                  className="border p-2 rounded"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">JLPT</span>
                <select
                  value={editJlpt}
                  onChange={(e) => setEditJlpt(e.target.value)}
                  className="border p-2 rounded bg-white"
                >
                  <option value="">NON-JLPT</option>
                  <option value="N5">N5</option>
                  <option value="N4">N4</option>
                  <option value="N3">N3</option>
                  <option value="N2">N2</option>
                  <option value="N1">N1</option>
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">Definition #</span>
                {editMeaningChoices.length > 0 ? (
                  <select
                    value={editMeaningChoiceIndex == null ? "other" : String(editMeaningChoiceIndex)}
                    onChange={(e) => changeDefinition(e.target.value)}
                    className="border p-2 rounded bg-white"
                  >
                    {editMeaningChoices.map((_, i) => (
                      <option key={i} value={i}>
                        {i + 1}
                      </option>
                    ))}
                    <option value="other">Other</option>
                  </select>
                ) : (
                  <select
                    value={editMeaningChoiceIndex == null ? "other" : "0"}
                    onChange={(e) => changeDefinition(e.target.value)}
                    className="border p-2 rounded bg-white"
                  >
                    <option value="other">Other</option>
                  </select>
                )}
              </label>

              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-xs text-gray-600">Meaning</span>
                <textarea
                  value={editMeaning}
                  onChange={(e) => setEditMeaning(e.target.value)}
                  className="border p-2 rounded min-h-[90px]"
                />
                {editMeaningChoices.length > 1 ? (
                  <p className="text-[11px] text-gray-500">
                    Tip: changing “Definition #” will overwrite Meaning to match that definition.
                  </p>
                ) : null}
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">Chapter #</span>
                <input
                  value={editChapterNum}
                  onChange={(e) => setEditChapterNum(e.target.value)}
                  className="border p-2 rounded"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">Chapter title</span>
                <input
                  value={editChapterName}
                  onChange={(e) => setEditChapterName(e.target.value)}
                  className="border p-2 rounded"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">Page</span>
                <input
                  value={editPage}
                  onChange={(e) => setEditPage(e.target.value)}
                  className="border p-2 rounded"
                />
              </label>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={closeEdit}
                disabled={editSaving}
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={editSaving || !editSurface.trim()}
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-50"
              >
                {editSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-2 mb-4 w-full border-b border-gray-300 pb-4">
        <p className="text-sm text-gray-500 text-center">
          The words you’ve added from this book, organized in reading order to support your reading.
        </p>
      </div>

      <div ref={stickyControlsRef} className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="flex items-start gap-3 py-3">
          {bookCover ? (
            <img src={bookCover} alt="" className="w-12 h-16 rounded object-cover shrink-0" />
          ) : null}

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold">{bookTitle || "Words"}</h1>
            <p className="text-sm text-gray-500">
              Total: {words.length} • Showing: {filteredSorted.length}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap items-center justify-end">
            <label className="flex items-center gap-2 text-sm px-3 py-2 border rounded bg-white whitespace-nowrap">
              <input
                type="checkbox"
                checked={showHidden}
                onChange={(e) => setShowHidden(e.target.checked)}
              />
              Hidden Words Only
            </label>
            <button
              onClick={() => router.push(`/books/${encodeURIComponent(userBookId)}`)}
              className="px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-800 text-sm whitespace-nowrap"
            >
              Book Hub
            </button>
          </div>
        </div>

        <div className="border-t border-gray-200 py-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search (word/reading/meaning/def #/page/chapter)…"
              className="border p-2 rounded w-full"
            />

            <select
              value={chapterFilter}
              onChange={(e) => setChapterFilter(e.target.value)}
              className="border p-2 rounded bg-white"
            >
              <option value="all">All chapters</option>
              {chapterOptions.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {reordering ? (
        <p className="mb-2 text-sm text-stone-500">Saving new order…</p>
      ) : (
        <p className="mb-2 text-sm text-stone-500">
          Drag words by ☰ to adjust their reading order.
        </p>
      )}

      <div className="overflow-x-auto overflow-y-visible border rounded bg-white relative">
        <table className="w-full text-sm border-separate border-spacing-0">

          <thead className="bg-gray-50">
            <tr className="text-left">
              <th
                className="p-2 w-10 sticky bg-gray-50 z-20"
                style={headerStickyStyle}
                title="Drag to reorder within the same page"
              >
                ↕
              </th>

              <th
                className="p-2 w-5 sticky bg-gray-50 z-20"
                style={headerStickyStyle}
                title="How many times this word appears in this book (same word + same definition)"
              >
                Repeats
              </th>

              <th className="p-2 w-20 sticky bg-gray-50 z-20" style={headerStickyStyle}>
                Word
              </th>
              <th className="p-2 w-30 sticky bg-gray-50 z-20" style={headerStickyStyle}>
                Reading
              </th>
              <th className="p-2 w-60 sticky bg-gray-50 z-20" style={headerStickyStyle}>
                Meaning
              </th>
              <th className="p-2 w-10 sticky bg-gray-50 z-20" style={headerStickyStyle}>
                Def #
              </th>
              <th className="p-2 w-5 sticky bg-gray-50 z-20" style={headerStickyStyle}>
                Chapter
              </th>
              <th className="p-2 w-10 sticky bg-gray-50 z-20" style={headerStickyStyle}>
                Page
              </th>
              <th className="p-2 w-20 sticky bg-gray-50 z-20" style={headerStickyStyle}>
                JLPT
              </th>
              <th className="p-2 w-25 sticky bg-gray-50 z-20" style={headerStickyStyle}>
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredSorted.map((w) => {
              const rep = repeatCounts.get(repeatKey(w)) ?? 0;

              return (
                <tr
                  key={w.id}
                  draggable
                  onDragStart={() => {
                    setDraggingId(w.id);
                    setDropTargetId(null);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (draggingId && draggingId !== w.id) {
                      setDropTargetId(w.id);
                    }
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();

                    const scrollY = window.scrollY;

                    if (draggingId && draggingId !== w.id) {
                      await moveWordInGroup(draggingId, w.id);
                    }

                    setDraggingId(null);
                    setDropTargetId(null);

                    requestAnimationFrame(() => {
                      window.scrollTo({ top: scrollY });
                    });
                  }}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setDropTargetId(null);
                  }}
                  className={`border-t ${w.hidden ? "bg-gray-50 text-gray-400" : ""
                    } ${dropTargetId === w.id ? "bg-blue-50" : ""
                    } ${draggingId === w.id ? "opacity-50" : ""
                    }`}
                >
                  <td
                    className="p-2 text-center text-gray-400 cursor-grab select-none"
                    title="Drag to reorder within this page"
                  >
                    ☰
                  </td>

                  <td className="p-2 text-center text-xs text-gray-600">
                    {rep > 1 ? rep : ""}
                  </td>

                  <td className="p-2 font-medium">{w.surface}</td>
                  <td className="p-2">{w.reading ?? "—"}</td>

                  <td className="p-2">
                    <div>{w.meaning ?? "—"}</div>
                  </td>

                  <td className="p-2 text-center">
                    {w.meaning_choice_index != null
                      ? w.meaning_choice_index + 1
                      : w.meaning
                        ? "O"
                        : "—"}
                  </td>

                  <td className="p-2">
                    {(() => {
                      const ch = chapterDisplayParts(w);
                      if (ch.num && ch.name) {
                        return (
                          <span className="leading-tight">
                            <span className="block">{ch.num}</span>
                            <span className="block text-gray-600">{ch.name}</span>
                          </span>
                        );
                      }
                      return ch.fallback;
                    })()}
                  </td>

                  <td className="p-2">{w.page_number ?? "—"}</td>
                  <td className="p-2">{normalizeJlpt(w.jlpt)}</td>

                  <td className="p-2">
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() =>
                          router.push(`/books/${encodeURIComponent(userBookId)}/words/${w.id}`)
                        }
                        className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-xs"
                        title="Open word card"
                      >
                        Open
                      </button>

                      <>
                        <button
                          onClick={() => openEdit(w)}
                          className="px-2 py-1 rounded bg-blue-400 hover:bg-green-500 text-xs"
                        >
                          Edit
                        </button>

                        {w.hidden ? (
                          <button
                            onClick={() => unhideWord(w)}
                            className="px-2 py-1 rounded bg-green-700 hover:bg-green-800 text-white text-xs"
                          >
                            Unhide
                          </button>
                        ) : (
                          <button
                            onClick={() => hideWord(w)}
                            className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-xs"
                          >
                            Hide
                          </button>
                        )}

                        <button
                          onClick={() => deleteWord(w)}
                          className="px-2 py-1 rounded bg-gray-700 hover:bg-red-700 text-white text-xs"
                        >
                          Delete
                        </button>
                      </>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredSorted.length === 0 ? (
              <tr>
                <td className="p-4 text-gray-500" colSpan={10}>
                  No words match your filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}