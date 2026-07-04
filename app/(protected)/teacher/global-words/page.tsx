// Teacher Global Word Entry
//

"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import GlobalWordAddEditCard from "./components/GlobalWordAddEditCard";
import GlobalWordDetailFields, {
  type GlobalWordType,
} from "./components/GlobalWordDetailFields";
import GlobalWordFormShell from "./components/GlobalWordFormShell";
import GlobalWordHelpPanel from "./components/GlobalWordHelpPanel";
import GlobalWordPageHeader from "./components/GlobalWordPageHeader";
import GlobalWordQuickSearchForm from "./components/GlobalWordQuickSearchForm";
import GlobalWordStatusMessage from "./components/GlobalWordStatusMessage";

function isSuperTeacherFlag(value: unknown) {
  return value === true || value === "true";
}

export default function TeacherGlobalWordsPage() {
  const [accessChecked, setAccessChecked] = useState(false);
  const [canAccess, setCanAccess] = useState(false);
  const [message, setMessage] = useState("");

  const [surface, setSurface] = useState("");
  const [reading, setReading] = useState("");
  const [meaningNote, setMeaningNote] = useState("");
  const [entryType, setEntryType] = useState<GlobalWordType>("vocabulary");
  const [jlpt, setJlpt] = useState("NON-JLPT");
  const [isCommon, setIsCommon] = useState(false);
  const [contextNote, setContextNote] = useState("");

  const [lookupLoading, setLookupLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isWordHelpOpen, setIsWordHelpOpen] = useState(false);
  const [scratchWord, setScratchWord] = useState("");
  const [kanjiLookupResetKey, setKanjiLookupResetKey] = useState(0);

  const surfaceInputRef = useRef<HTMLInputElement | null>(null);
  const fieldsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkTeacherAccess() {
      setAccessChecked(false);
      setCanAccess(false);
      setMessage("");

      const { data: auth, error: authError } = await supabase.auth.getUser();
      const user = auth?.user;

      if (cancelled) return;

      if (authError || !user) {
        setMessage("Please sign in to use Global Word Entry.");
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

      const isTeacher =
        profile?.role === "teacher" ||
        profile?.role === "super_teacher" ||
        isSuperTeacherFlag(profile?.is_super_teacher);

      setCanAccess(isTeacher);
      setMessage(isTeacher ? "" : "Teacher access is required.");
      setAccessChecked(true);
    }

    void checkTeacherAccess();

    return () => {
      cancelled = true;
    };
  }, []);

  function clearWordHelp() {
    setIsWordHelpOpen(false);
    setScratchWord("");
    setKanjiLookupResetKey((key) => key + 1);
  }

  function clearForm() {
    setSurface("");
    setReading("");
    setMeaningNote("");
    setEntryType("vocabulary");
    setJlpt("NON-JLPT");
    setIsCommon(false);
    setContextNote("");
    clearWordHelp();
    setMessage("");
    window.setTimeout(() => surfaceInputRef.current?.focus({ preventScroll: true }), 0);
  }

  function extractMeaningChoices(entry: any) {
    const senses = Array.isArray(entry?.senses) ? entry.senses : [];
    const choices: string[] = [];

    for (const sense of senses) {
      const definitions = Array.isArray(sense?.english_definitions)
        ? sense.english_definitions
            .map((definition: unknown) => String(definition).trim())
            .filter(Boolean)
        : [];

      if (definitions.length === 0) continue;
      choices.push(definitions.slice(0, 4).join("; "));
    }

    return Array.from(new Set(choices));
  }

  function normalizeJlpt(value: unknown) {
    const text = String(value ?? "").trim().toUpperCase().replace(/^JLPT[-_\s]?/, "");
    if (text === "N5" || text === "N4" || text === "N3" || text === "N2" || text === "N1") return text;
    return "NON-JLPT";
  }

  async function handleLookup() {
    const keyword = surface.trim();
    if (!keyword || lookupLoading) return;

    setLookupLoading(true);
    setMessage("");

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Please sign in again before searching.");

      const response = await fetch(`/api/jisho?keyword=${encodeURIComponent(keyword)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error ?? "Could not search dictionary/cache.");

      const entry = Array.isArray(json?.data) ? json.data[0] : null;
      if (!entry) {
        setMessage("No dictionary/cache match found. Fill the fields manually, then save globally.");
        fieldsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      const japanese = Array.isArray(entry?.japanese) ? entry.japanese[0] ?? {} : {};
      const nextSurface = String(japanese.word ?? keyword).trim();
      const nextReading = String(japanese.reading ?? "").trim();
      const meaningChoices = extractMeaningChoices(entry);

      if (nextSurface) setSurface(nextSurface);
      if (nextReading) setReading(nextReading);
      if (meaningChoices[0]) setMeaningNote(meaningChoices[0]);
      setJlpt(normalizeJlpt(Array.isArray(entry?.jlpt) ? entry.jlpt[0] : null));
      setIsCommon(!!entry?.is_common);
      setMessage("✅ Found a match. Check the fields, then save globally.");
      fieldsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err: any) {
      console.error("Global word lookup failed:", err);
      setMessage(`❌ ${err?.message ?? "Could not search dictionary/cache."}`);
    } finally {
      setLookupLoading(false);
    }
  }

  function handleUseScratchWord() {
    const nextSurface = scratchWord.trim();
    if (!nextSurface) return;

    setSurface(nextSurface);
    clearWordHelp();
    setMessage("");
    window.requestAnimationFrame(() => surfaceInputRef.current?.focus());
  }

  function handlePickKanji(kanji: string) {
    setScratchWord((prev) => `${prev}${kanji}`);
  }

  async function handleSaveGlobalWord() {
    const cleanSurface = surface.trim();
    const cleanReading = reading.trim();
    const cleanMeaning = meaningNote.trim();

    if (!cleanSurface) {
      setMessage("❌ Surface is required.");
      return;
    }

    if (!cleanReading) {
      setMessage("❌ Reading is required.");
      return;
    }

    if (!cleanMeaning) {
      setMessage("❌ Meaning / note is required.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Please sign in again before saving.");

      const response = await fetch("/api/teacher/global-words", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          surface: cleanSurface,
          reading: cleanReading,
          meaning: cleanMeaning,
          entry_type: entryType,
          jlpt,
          is_common: isCommon,
          context_note: contextNote.trim(),
        }),
      });

      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error ?? "Could not save global word.");

      const action = json?.created ? "created" : "updated";
      const kanjiCreated = Number(json?.kanji_map?.created ?? 0);
      setMessage(`✅ Global word ${action}. Kanji queue rows added: ${kanjiCreated}. Word Sky was not changed.`);
    } catch (err: any) {
      console.error("Global word save failed:", err);
      setMessage(`❌ ${err?.message ?? "Could not save global word."}`);
    } finally {
      setSaving(false);
    }
  }

  if (!accessChecked) {
    return (
      <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-gray-500">Loading teacher access...</p>
        </div>
      </main>
    );
  }

  if (!canAccess) {
    return (
      <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-3xl">
          <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
              Teacher access
            </p>
            <h1 className="mt-2 text-2xl font-black text-stone-900">
              Global Word Entry
            </h1>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              {message || "Teacher access is required."}
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <GlobalWordPageHeader />
        <GlobalWordStatusMessage message={message} />

        <GlobalWordAddEditCard>
          <GlobalWordFormShell surface={surface}>
            <div className="grid gap-3 lg:grid-cols-2 lg:items-end">
              <GlobalWordQuickSearchForm
                surface={surface}
                lookupLoading={lookupLoading}
                inputRef={surfaceInputRef}
                onSurfaceChange={(value) => {
                  setSurface(value);
                  setMessage("");
                }}
                onLookup={handleLookup}
              />

              <div className="flex min-h-12 items-center rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-500">
                Saves to the global vocabulary cache only. Word Sky approval stays separate and N5-N3 only.
              </div>
            </div>

            <GlobalWordHelpPanel
              isOpen={isWordHelpOpen}
              scratchWord={scratchWord}
              resetKey={kanjiLookupResetKey}
              onToggleOpen={setIsWordHelpOpen}
              onScratchWordChange={setScratchWord}
              onUseScratchWord={handleUseScratchWord}
              onPickKanji={handlePickKanji}
            />

            <GlobalWordDetailFields
              fieldsRef={fieldsRef}
              surface={surface}
              reading={reading}
              meaningNote={meaningNote}
              entryType={entryType}
              jlpt={jlpt}
              isCommon={isCommon}
              contextNote={contextNote}
              onReadingChange={setReading}
              onMeaningNoteChange={setMeaningNote}
              onEntryTypeChange={setEntryType}
              onJlptChange={setJlpt}
              onIsCommonChange={setIsCommon}
              onContextNoteChange={setContextNote}
              onSave={handleSaveGlobalWord}
              saving={saving}
              onClear={clearForm}
            />
          </GlobalWordFormShell>
        </GlobalWordAddEditCard>
      </div>
    </main>
  );
}
