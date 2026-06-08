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

  function handlePlaceholderLookup() {
    setLookupLoading(true);

    window.setTimeout(() => {
      setLookupLoading(false);
      setMessage(
        "Global lookup is not wired yet. This page is ready for the next implementation pass."
      );
      fieldsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 250);
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

  function handlePlaceholderSave() {
    // TODO: In the next implementation pass, validate and route this draft to
    // the appropriate global vocabulary/cultural-reference save flow.
    setMessage(
      "Global save is not wired yet. This page is ready for the next implementation pass."
    );
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
                onLookup={handlePlaceholderLookup}
              />

              <div className="flex min-h-12 items-center rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-500">
                Single global entry draft. Cache writes, Word Sky approval, and kanji-map generation are intentionally disabled.
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
              onPlaceholderSave={handlePlaceholderSave}
              onClear={clearForm}
            />
          </GlobalWordFormShell>
        </GlobalWordAddEditCard>
      </div>
    </main>
  );
}
