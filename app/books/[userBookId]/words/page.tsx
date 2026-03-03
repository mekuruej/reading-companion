"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type WordRow = {
  id: string;
  user_book_id: string;
  surface: string;
  reading: string | null;
  meaning: string | null;
  jlpt: string | null;
  is_common: boolean | null;
  page_number: number | null;
  chapter_number: number | null;
  chapter_name: string | null;
  seen_on: string | null;
  created_at: string;

  // ✅ definition support
  meaning_choices: any | null; // jsonb
  meaning_choice_index: number | null;
};

function normalizeJlpt(val: string | null | undefined) {
  const v = (val ?? "").toUpperCase();
  if (v === "N1" || v === "N2" || v === "N3" || v === "N4" || v === "N5") return v;
  return "NON-JLPT";
}

// For dropdown/search/filter: always use a single-line label
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

// ✅ jsonb -> string[]
function asStringArray(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map((x) => String(x)).filter(Boolean);
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.map((x) => String(x)).filter(Boolean);
    } catch {}
  }
  return [];
}

export default function BookWordsPage() {
  const params = useParams<{ userBookId: string }>();
  const userBookId = params.userBookId;

  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [bookTitle, setBookTitle] = useState("");
  const [bookCover, setBookCover] = useState("");

  const [words, setWords] = useState<WordRow[]>([]);
  const [query, setQuery] = useState("");
  const [chapterFilter, setChapterFilter] = useState("all");
  const [chapterOptions, setChapterOptions] = useState<{ value: string; label: string }[]>([]);

  // --- Edit modal state ---
  const [editing, setEditing] = useState<WordRow | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editErr, setEditErr] = useState<string | null>(null);

  // Editable fields
  const [editSurface, setEditSurface] = useState("");
  const [editReading, setEditReading] = useState("");
  const [editMeaning, setEditMeaning] = useState("");
  const [editPage, setEditPage] = useState<string>("");
  const [editChapterNum, setEditChapterNum] = useState<string>("");
  const [editChapterName, setEditChapterName] = useState("");

  // ✅ definition edit state
  const [editMeaningChoices, setEditMeaningChoices] = useState<string[]>([]);
  const [editMeaningChoiceIndex, setEditMeaningChoiceIndex] = useState<number>(0);

  function openEdit(w: WordRow) {
    setEditErr(null);
    setEditing(w);

    setEditSurface(w.surface ?? "");
    setEditReading(w.reading ?? "");
    setEditMeaning(w.meaning ?? "");

    setEditPage(w.page_number != null ? String(w.page_number) : "");
    setEditChapterNum(w.chapter_number != null ? String(w.chapter_number) : "");
    setEditChapterName(w.chapter_name ?? "");

    const choices = asStringArray((w as any).meaning_choices);
    const idxRaw = Number.isFinite(w.meaning_choice_index as any) ? (w.meaning_choice_index as number) : 0;
    const idx = choices.length ? Math.max(0, Math.min(idxRaw, choices.length - 1)) : 0;

    setEditMeaningChoices(choices);
    setEditMeaningChoiceIndex(idx);

    // If choices exist, make sure meaning matches selected choice (but don’t clobber custom meaning if blank)
    if (choices.length && choices[idx]) {
      setEditMeaning(choices[idx]);
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

  // ✅ change definition choice in modal and sync meaning field
  function changeDefinition(newIndex: number) {
    const choices = editMeaningChoices ?? [];
    if (!choices.length) return;

    const safe = Math.max(0, Math.min(newIndex, choices.length - 1));
    setEditMeaningChoiceIndex(safe);

    const chosen = choices[safe] ?? "";
    if (chosen) setEditMeaning(chosen);
  }

  async function saveEdit() {
    if (!editing) return;

    setEditSaving(true);
    setEditErr(null);

    const hasChoices = (editMeaningChoices?.length ?? 0) > 0;

    const patch: Partial<WordRow> & {
      meaning_choices?: any;
      meaning_choice_index?: number;
    } = {
      surface: editSurface.trim(),
      reading: editReading.trim() ? editReading.trim() : null,
      meaning: editMeaning.trim() ? editMeaning.trim() : null,
      page_number: parseNullableInt(editPage),
      chapter_number: parseNullableInt(editChapterNum),
      chapter_name: editChapterName.trim() ? editChapterName.trim() : null,
    };

    if (hasChoices) {
      patch.meaning_choice_index = editMeaningChoiceIndex;
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

        const { data: rows, error: wErr } = await supabase
          .from("user_book_words")
          .select(
            `
            id,
            user_book_id,
            surface,
            reading,
            meaning,
            jlpt,
            is_common,
            page_number,
            chapter_number,
            chapter_name,
            seen_on,
            created_at,
            meaning_choices,
            meaning_choice_index
          `
          )
          .eq("user_book_id", userBookId)
          .order("chapter_number", { ascending: true, nullsFirst: false })
          .order("page_number", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: true })
          .order("id", { ascending: true })
          .returns<WordRow[]>();

        if (wErr) throw wErr;

        const list = rows ?? [];
        setWords(list);

        const map = new Map<string, string>();
        for (const w of list) {
          const label = chapterDisplayParts(w).fallback;
          map.set(label, label);
        }

        const opts = Array.from(map.values())
          .filter(Boolean)
          .map((label) => ({ value: label, label }));

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
  }, [userBookId]);

  // ✅ Repeats map (count same surface within this book)
  const repeatCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const w of words) {
      const key = (w.surface ?? "").trim();
      if (!key) continue;
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return m;
  }, [words]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return words.filter((w) => {
      const ch = chapterDisplayParts(w).fallback;
      if (chapterFilter !== "all" && ch !== chapterFilter) return false;

      if (!q) return true;

      const hay = [
        w.surface,
        w.reading ?? "",
        w.meaning ?? "",
        normalizeJlpt(w.jlpt),
        ch,
        w.page_number?.toString() ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [words, query, chapterFilter]);

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
    <main className="max-w-6xl mx-auto p-6">
      {/* Edit Modal */}
      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Edit word</h2>
                <p className="text-xs text-gray-500 mt-1">
                  {editing.surface} • {editing.id}
                </p>
              </div>
              <button onClick={closeEdit} className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300 text-sm">
                ✕ Close
              </button>
            </div>

            {editErr ? <p className="mt-3 text-sm text-red-700">{editErr}</p> : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">Word</span>
                <input value={editSurface} onChange={(e) => setEditSurface(e.target.value)} className="border p-2 rounded" />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">Reading</span>
                <input value={editReading} onChange={(e) => setEditReading(e.target.value)} className="border p-2 rounded" />
              </label>

              {editMeaningChoices.length > 1 ? (
                <div className="sm:col-span-2 border rounded p-3 bg-gray-50">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-gray-600">
                      Definition: <span className="font-medium">{editMeaningChoiceIndex + 1}</span>/{editMeaningChoices.length}
                    </div>

                    <select
                      value={editMeaningChoiceIndex}
                      onChange={(e) => changeDefinition(Number(e.target.value))}
                      className="border p-1 rounded text-sm bg-white"
                      title="Choose which dictionary definition to use"
                    >
                      {editMeaningChoices.map((_, i) => (
                        <option key={i} value={i}>
                          {i + 1}
                        </option>
                      ))}
                    </select>
                  </div>

                  <details className="mt-2 text-xs text-gray-600">
                    <summary className="cursor-pointer select-none">Show all definitions</summary>
                    <ol className="list-decimal ml-5 mt-2 space-y-1">
                      {editMeaningChoices.map((m, i) => (
                        <li key={i} className={i === editMeaningChoiceIndex ? "font-medium text-gray-900" : ""}>
                          {m}
                        </li>
                      ))}
                    </ol>
                  </details>
                </div>
              ) : null}

              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-xs text-gray-600">Meaning</span>
                <textarea value={editMeaning} onChange={(e) => setEditMeaning(e.target.value)} className="border p-2 rounded min-h-[90px]" />
                {editMeaningChoices.length > 1 ? (
                  <p className="text-[11px] text-gray-500">Tip: changing “Definition #” will overwrite Meaning to match that definition.</p>
                ) : null}
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">Chapter #</span>
                <input value={editChapterNum} onChange={(e) => setEditChapterNum(e.target.value)} className="border p-2 rounded" />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">Chapter title</span>
                <input value={editChapterName} onChange={(e) => setEditChapterName(e.target.value)} className="border p-2 rounded" />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-600">Page</span>
                <input value={editPage} onChange={(e) => setEditPage(e.target.value)} className="border p-2 rounded" />
              </label>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button onClick={closeEdit} disabled={editSaving} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-sm disabled:opacity-50">
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

      <div className="flex items-center gap-3 mb-4">
        {bookCover ? <img src={bookCover} alt="" className="w-12 h-16 rounded object-cover" /> : null}

        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{bookTitle || "Words"}</h1>
          <p className="text-sm text-gray-500">
            Total: {words.length} • Showing: {filtered.length}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/vocab/bulk?userBookId=${encodeURIComponent(userBookId)}`)}
            className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            + Add Vocab
          </button>

          <button
            onClick={() => router.push(`/books/${encodeURIComponent(userBookId)}/study`)}
            className="px-3 py-2 bg-green-700 text-white rounded hover:bg-amber-600 text-sm"
          >
            Study
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search (word/reading/meaning/page/chapter)…"
          className="border p-2 rounded w-full"
        />

        <select value={chapterFilter} onChange={(e) => setChapterFilter(e.target.value)} className="border p-2 rounded bg-white">
          <option value="all">All chapters</option>
          {chapterOptions.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto border rounded bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              {/* ✅ NEW: repeats column */}
              <th className="p-2 w-8 text-center" title="How many times this word appears in this book">
                Repeats
              </th>
              <th className="p-2 w-25">Word</th>
              <th className="p-2 w-25">Reading</th>
              <th className="p-2 w-60">Meaning</th>
              <th className="p-2 w-30">Chapter</th>
              <th className="p-2 w-10">Page</th>
              <th className="p-2 w-20">JLPT</th>
              <th className="p-2 w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((w) => {
              const rep = repeatCounts.get((w.surface ?? "").trim()) ?? 0;
              return (
                <tr key={w.id} className="border-t">
                  {/* ✅ NEW: repeats cell */}
                  <td className="p-2 text-center text-xs text-gray-600">
                    {rep > 1 ? rep : ""}
                  </td>

                  <td className="p-2 font-medium">{w.surface}</td>
                  <td className="p-2">{w.reading ?? "—"}</td>
                  <td className="p-2">{w.meaning ?? "—"}</td>

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
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(w)} className="px-2 py-1 rounded bg-blue-400 hover:bg-green-500 text-xs">
                        Edit
                      </button>
                      <button
                        onClick={() => deleteWord(w)}
                        className="px-2 py-1 rounded bg-gray-700 hover:bg-red-700 text-white text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 ? (
              <tr>
                {/* ✅ updated colSpan (now 8 -> 9) */}
                <td className="p-4 text-gray-500" colSpan={9}>
                  No words match your filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <button onClick={() => router.push("/books")} className="text-sm text-slate-600 hover:underline">
          ← Back to Books
        </button>
      </div>
    </main>
  );
}