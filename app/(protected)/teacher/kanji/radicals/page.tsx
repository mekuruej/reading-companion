"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getTeacherBackLink } from "../../components/teacherBackLink";

type RadicalQueueItem = {
  kanji: string;
  count: number;
  has_radical: boolean;
  radical: string | null;
  radical_name: string | null;
  radical_english_name: string | null;
  jlpt_level: string | null;
  is_jouyou: boolean | null;
  school_grade: number | null;
  stroke_count: number | null;
  notes: string | null;
  source: string | null;
  updated_at: string | null;
  components: { component: string; component_name: string | null; sort_order: number | null }[];
};

type EditorState = {
  kanji: string;
  radical: string;
  radical_name: string;
  radical_english_name: string;
  jlpt_level: string;
  is_jouyou: string;
  school_grade: string;
  components: string;
  stroke_count: string;
  notes: string;
  source: string;
};

function isSuperTeacherFlag(value: unknown) {
  return value === true || value === "true";
}

function firstChar(value: string) {
  return Array.from(value.trim())[0] ?? "";
}

function editorFromItem(item: RadicalQueueItem): EditorState {
  return {
    kanji: item.kanji,
    radical: item.radical ?? "",
    radical_name: item.radical_name ?? "",
    radical_english_name: item.radical_english_name ?? "",
    jlpt_level: item.jlpt_level ?? "",
    is_jouyou: item.is_jouyou == null ? "true" : item.is_jouyou ? "true" : "false",
    school_grade: item.school_grade == null ? "" : String(item.school_grade),
    components: (item.components ?? []).map((component) => component.component).join(" "),
    stroke_count: item.stroke_count == null ? "" : String(item.stroke_count),
    notes: item.notes ?? "",
    source: item.source ?? "jisho+kakimashou",
  };
}

export default function TeacherKanjiRadicalsPage() {
  const searchParams = useSearchParams();
  const fromParam = searchParams.get("from");
  const backLink = getTeacherBackLink(fromParam);
  const isNeedsAttention = fromParam === "needs-attention";
  const headerCopy = isNeedsAttention
    ? {
        eyebrow: "Needs Attention",
        title: "Radical Needs Attention",
        description:
          "Add missing main radicals, visible components, and stroke information for kanji already used in the kanji reading map.",
      }
    : {
        eyebrow: "Kanji upkeep",
        title: "Radical Upkeep",
        description:
          "Add the main radical, other visible radicals/components, and stroke information for kanji already used in the kanji reading map.",
      };

  const [accessChecked, setAccessChecked] = useState(false);
  const [canAccess, setCanAccess] = useState(false);
  const [message, setMessage] = useState("");
  const [keyword, setKeyword] = useState("");
  const [items, setItems] = useState<RadicalQueueItem[]>([]);
  const [selected, setSelected] = useState<RadicalQueueItem | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkAccess() {
      setAccessChecked(false);
      setCanAccess(false);
      setMessage("");

      const { data: auth, error: authError } = await supabase.auth.getUser();
      const user = auth?.user;

      if (cancelled) return;

      if (authError || !user) {
        setMessage("Please sign in to use Radical Upkeep.");
        setAccessChecked(true);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, is_super_teacher")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (profileError) {
        setMessage(profileError.message ?? "Could not load teacher profile.");
        setAccessChecked(true);
        return;
      }

      const isSuperTeacher =
        profile?.role === "super_teacher" || isSuperTeacherFlag(profile?.is_super_teacher);

      setCanAccess(isSuperTeacher);
      setMessage(isSuperTeacher ? "" : "Super teacher access is required.");
      setAccessChecked(true);
    }

    void checkAccess();

    return () => {
      cancelled = true;
    };
  }, []);

  async function loadRadicals(nextKeyword = keyword) {
    setLoading(true);
    setMessage("");

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Please sign in again before searching.");

      const params = new URLSearchParams();
      if (nextKeyword.trim()) params.set("keyword", nextKeyword.trim());

      const response = await fetch(`/api/teacher/kanji-radicals?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error ?? "Could not load radical queue.");

      const results = Array.isArray(json?.results) ? (json.results as RadicalQueueItem[]) : [];
      setItems(results);

      if (selected && !results.some((item) => item.kanji === selected.kanji)) {
        setSelected(null);
        setEditor(null);
      }
    } catch (err: any) {
      setMessage(err?.message ?? "Could not load radical queue.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (canAccess) void loadRadicals("");
  }, [canAccess]);

  function selectItem(item: RadicalQueueItem) {
    setSelected(item);
    setEditor(editorFromItem(item));
    setMessage("");
  }

  function updateEditor(field: keyof EditorState, value: string) {
    setEditor((previous) => {
      if (!previous) return previous;
      if (field === "kanji" || field === "radical") return { ...previous, [field]: firstChar(value) };
      return { ...previous, [field]: value };
    });
  }

  async function saveRadical() {
    if (!editor) return;
    setSaving(true);
    setMessage("");

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Please sign in again before saving.");

      const response = await fetch("/api/teacher/kanji-radicals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editor),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error ?? "Could not save radical.");

      setMessage(`Saved radical info for ${editor.kanji}.`);
      await loadRadicals();
    } catch (err: any) {
      setMessage(err?.message ?? "Could not save radical.");
    } finally {
      setSaving(false);
    }
  }

  const missingCount = items.filter((item) => !item.has_radical).length;

  if (!accessChecked) {
    return (
      <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-6xl text-sm text-stone-500">Loading teacher access...</div>
      </main>
    );
  }

  if (!canAccess) {
    return (
      <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-8">
        <section className="mx-auto max-w-3xl rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
            Teacher access
          </p>
          <h1 className="mt-2 text-2xl font-black text-stone-900">Radical Upkeep</h1>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            {message || "Super teacher access is required."}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <Link href={backLink.href} className="text-sm font-semibold text-stone-500 hover:text-stone-900">
            ← {backLink.label}
          </Link>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
            {headerCopy.eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-stone-900">
            {headerCopy.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
            {headerCopy.description}
          </p>
          <p className="mt-3 max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-900">
            Mekuru uses the KangXi main radical as the official answer. If Nelson or another source lists a different main radical, put it in Notes as an alternative main radical.
          </p>
        </section>

        {message ? (
          <div
            className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${
              message.startsWith("Saved")
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-amber-200 bg-amber-50 text-amber-900"
            }`}
          >
            {message}
          </div>
        ) : null}

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="rounded-3xl border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-stone-200 p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                    Radical queue
                  </p>
                  <h2 className="mt-2 text-xl font-black text-stone-900">
                    {missingCount} missing in this view
                  </h2>
                </div>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void loadRadicals(keyword);
                  }}
                  className="flex gap-2"
                >
                  <input
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="Find kanji..."
                    className="min-h-11 w-36 rounded-xl border border-stone-300 bg-white px-3 py-2 text-base outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-200"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-xl bg-stone-950 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
                  >
                    {loading ? "Loading..." : "Search"}
                  </button>
                </form>
              </div>
            </div>

            <div className="max-h-[42rem] divide-y divide-stone-100 overflow-y-auto">
              {items.length === 0 ? (
                <div className="p-5 text-sm text-stone-500">No kanji found.</div>
              ) : (
                items.map((item) => {
                  const isSelected = selected?.kanji === item.kanji;
                  return (
                    <button
                      key={item.kanji}
                      type="button"
                      onClick={() => selectItem(item)}
                      className={`flex w-full items-center justify-between gap-4 p-4 text-left transition ${
                        isSelected ? "bg-stone-100" : "bg-white hover:bg-stone-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-stone-200 bg-stone-50 text-3xl font-black text-stone-950">
                          {item.kanji}
                        </span>
                        <div>
                          <p className="text-sm font-black text-stone-900">
                            {item.has_radical
                              ? [item.radical, item.radical_name, item.radical_english_name].filter(Boolean).join(" · ")
                              : "Needs radical"}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-stone-500">
                            {item.count} mapped row{item.count === 1 ? "" : "s"}
                            {item.jlpt_level ? ` · ${item.jlpt_level}` : ""}
                            {item.stroke_count ? ` · ${item.stroke_count} strokes` : ""}
                            {item.is_jouyou == null ? "" : item.is_jouyou ? " · Jouyou" : " · Not Jouyou"}
                            {item.school_grade ? ` · ${item.school_grade === 8 ? "Junior High" : item.school_grade === 9 ? "High School" : `Grade ${item.school_grade}`}` : ""}
                            {item.source ? ` · ${item.source}` : ""}
                            {item.components?.length ? ` · parts: ${item.components.map((component) => component.component).join(" ")}` : ""}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                          item.has_radical
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                        }`}
                      >
                        {item.has_radical ? "Ready" : "Missing"}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
              Editor
            </p>
            {!editor ? (
              <p className="mt-4 text-sm leading-6 text-stone-600">
                Choose a kanji from the queue to add its radical information.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                <label className="block text-sm font-semibold text-stone-700">
                  Kanji
                  <input
                    value={editor.kanji ?? ""}
                    onChange={(event) => updateEditor("kanji", event.target.value)}
                    className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-3xl font-black"
                  />
                </label>

                <label className="block text-sm font-semibold text-stone-700">
                  Main radical
                  <input
                    value={editor.radical ?? ""}
                    onChange={(event) => updateEditor("radical", event.target.value)}
                    placeholder="言"
                    className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-3xl font-black"
                  />
                  <span className="mt-1 block text-xs font-normal leading-5 text-stone-500">
                    Use the KangXi main radical here. Put Nelson or alternate source radicals in Notes as alternative main radicals.
                  </span>
                </label>

                <label className="block text-sm font-semibold text-stone-700">
                  Other radicals/components
                  <input
                    value={editor.components ?? ""}
                    onChange={(event) => updateEditor("components", event.target.value)}
                    placeholder="言 五 口"
                    className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xl font-black"
                  />
                  <span className="mt-1 block text-xs font-normal leading-5 text-stone-500">
                    Add every visible part you want learners to compare. Spaces or commas are fine; the main radical is saved here too.
                  </span>
                </label>

                <label className="block text-sm font-semibold text-stone-700">
                  Stroke count
                  <input
                    value={editor.stroke_count ?? ""}
                    onChange={(event) => updateEditor("stroke_count", event.target.value)}
                    inputMode="numeric"
                    placeholder="3"
                    className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                  />
                </label>

                <label className="block text-sm font-semibold text-stone-700">
                  Jouyou status
                  <select
                    value={editor.is_jouyou ?? ""}
                    onChange={(event) => updateEditor("is_jouyou", event.target.value)}
                    className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Unknown</option>
                    <option value="true">Jouyou</option>
                    <option value="false">Not Jouyou</option>
                  </select>
                </label>

                <label className="block text-sm font-semibold text-stone-700">
                  School grade
                  <select
                    value={editor.school_grade ?? ""}
                    onChange={(event) => updateEditor("school_grade", event.target.value)}
                    className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Unknown</option>
                    <option value="1">Grade 1</option>
                    <option value="2">Grade 2</option>
                    <option value="3">Grade 3</option>
                    <option value="4">Grade 4</option>
                    <option value="5">Grade 5</option>
                    <option value="6">Grade 6</option>
                    <option value="8">Junior High</option>
                    <option value="9">High School</option>
                  </select>
                </label>

                <label className="block text-sm font-semibold text-stone-700">
                  Kanji JLPT level
                  <select
                    value={editor.jlpt_level ?? ""}
                    onChange={(event) => updateEditor("jlpt_level", event.target.value)}
                    className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Unlabeled</option>
                    <option value="N5">N5</option>
                    <option value="N4">N4</option>
                    <option value="N3">N3</option>
                    <option value="N2">N2</option>
                    <option value="N1">N1</option>
                  </select>
                </label>

                <label className="block text-sm font-semibold text-stone-700">
                  Kakimashou/source radical name
                  <input
                    value={editor.radical_name ?? ""}
                    onChange={(event) => updateEditor("radical_name", event.target.value)}
                    placeholder="ごんべん"
                    className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                  />
                </label>

                <label className="block text-sm font-semibold text-stone-700">
                  Learner English name
                  <input
                    value={editor.radical_english_name ?? ""}
                    onChange={(event) => updateEditor("radical_english_name", event.target.value)}
                    placeholder="speech"
                    className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                  />
                  <span className="mt-1 block text-xs font-normal leading-5 text-stone-500">
                    Optional. Use this for future learner-facing radical cards.
                  </span>
                </label>


                <label className="block text-sm font-semibold text-stone-700">
                  Source
                  <input
                    value={editor.source ?? ""}
                    onChange={(event) => updateEditor("source", event.target.value)}
                    placeholder="jisho+kakimashou"
                    className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                  />
                  <span className="mt-1 block text-xs font-normal leading-5 text-stone-500">
                    Example: jisho+kakimashou, jisho, or kakimashou.
                  </span>
                </label>

                <label className="block text-sm font-semibold text-stone-700">
                  Notes
                  <textarea
                    value={editor.notes ?? ""}
                    onChange={(event) => updateEditor("notes", event.target.value)}
                    rows={3}
                    placeholder="alternative main: 心 忄"
                    className="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
                  />
                  <span className="mt-1 block text-xs font-normal leading-5 text-stone-500">
                    If another source lists a second main radical, add it like: alternative main: 心 忄. Radical flashcards will not use those as same-card distractors.
                  </span>
                </label>

                <button
                  type="button"
                  onClick={saveRadical}
                  disabled={saving || !editor.kanji || !editor.radical}
                  className="w-full rounded-xl bg-stone-950 px-4 py-3 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Radical Info"}
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
