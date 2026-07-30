// Story Notes Page
//
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import AccessDeniedMessage from "@/components/AccessDeniedMessage";
import { getAppAccessStatus, isMissingAppAccessColumnError } from "@/lib/access/appAccess";
import { getFeatureAccess } from "@/lib/access/featureAccess";
import { getFullAccessRequiredCopy } from "@/lib/access/requireFullAccess";
import { supabase } from "@/lib/supabaseClient";
import StoryTab from "../components/tabs/StoryTab";

type ProfileRole = "teacher" | "member" | "student" | "super_teacher" | "admin";

type BookRow = {
  title: string | null;
  title_reading: string | null;
  author: string | null;
  cover_url: string | null;
  language_code: string | null;
};

type UserBookRow = {
  id: string;
  user_id: string;
  books: BookRow | null;
};

type Character = {
  id: string;
  user_book_id: string;
  name: string;
  reading: string | null;
  role: string | null;
  first_seen_page_number: number | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type ChapterSummary = {
  id: string;
  user_book_id: string;
  chapter_number: number | null;
  chapter_title: string | null;
  summary: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type SettingItem = {
  id: string;
  user_book_id: string;
  title: string | null;
  details: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type CulturalItem = {
  id: string;
  user_book_id: string;
  title: string | null;
  details: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function isSuperTeacherFlag(value: unknown) {
  return value === true || value === "true";
}

export default function StoryNotesPage() {
  const params = useParams<{ userBookId: string }>();
  const userBookId = params?.userBookId;

  const [loading, setLoading] = useState(true);
  const [accessMessage, setAccessMessage] = useState("");
  const [row, setRow] = useState<UserBookRow | null>(null);
  const [storyTab, setStoryTab] = useState<"characters" | "plot" | "setting" | "cultural">("characters");

  const [characters, setCharacters] = useState<Character[]>([]);
  const [showCharacters, setShowCharacters] = useState(true);
  const [charactersReverseOrder, setCharactersReverseOrder] = useState(false);
  const [editingCharacterIds, setEditingCharacterIds] = useState<string[]>([]);
  const [savingCharacterIds, setSavingCharacterIds] = useState<string[]>([]);
  const [savedCharacterIds, setSavedCharacterIds] = useState<string[]>([]);

  const [chapterSummaries, setChapterSummaries] = useState<ChapterSummary[]>([]);
  const [showChapterSummaries, setShowChapterSummaries] = useState(false);
  const [chapterReverseOrder, setChapterReverseOrder] = useState(false);
  const [editingChapterIds, setEditingChapterIds] = useState<string[]>([]);
  const [savingChapterIds, setSavingChapterIds] = useState<string[]>([]);
  const [savedChapterIds, setSavedChapterIds] = useState<string[]>([]);

  const [settingItems, setSettingItems] = useState<SettingItem[]>([]);
  const [showSettingItems, setShowSettingItems] = useState(true);
  const [settingReverseOrder, setSettingReverseOrder] = useState(false);
  const [editingSettingIds, setEditingSettingIds] = useState<string[]>([]);
  const [savingSettingIds, setSavingSettingIds] = useState<string[]>([]);
  const [savedSettingIds, setSavedSettingIds] = useState<string[]>([]);

  const [culturalItems, setCulturalItems] = useState<CulturalItem[]>([]);
  const [showCulturalItems, setShowCulturalItems] = useState(true);
  const [culturalReverseOrder, setCulturalReverseOrder] = useState(false);
  const [editingCulturalIds, setEditingCulturalIds] = useState<string[]>([]);
  const [savingCulturalIds, setSavingCulturalIds] = useState<string[]>([]);
  const [savedCulturalIds, setSavedCulturalIds] = useState<string[]>([]);

  const visibleCharacters = useMemo(() => {
    const copy = [...characters];
    return charactersReverseOrder ? copy.reverse() : copy;
  }, [characters, charactersReverseOrder]);

  const visibleChapterSummaries = useMemo(() => {
    const copy = [...chapterSummaries];
    return chapterReverseOrder ? copy.reverse() : copy;
  }, [chapterSummaries, chapterReverseOrder]);

  const visibleSettingItems = useMemo(() => {
    const copy = [...settingItems];
    return settingReverseOrder ? copy.reverse() : copy;
  }, [settingItems, settingReverseOrder]);

  const visibleCulturalItems = useMemo(() => {
    const copy = [...culturalItems];
    return culturalReverseOrder ? copy.reverse() : copy;
  }, [culturalItems, culturalReverseOrder]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setAccessMessage("");
      setRow(null);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (authError || !user || !userBookId) {
        setAccessMessage("Please sign in to use Story Notes.");
        setLoading(false);
        return;
      }

      const profileResult = await supabase
        .from("profiles")
        .select("role, is_super_teacher, app_access_type, app_access_expires_at")
        .eq("id", user.id)
        .maybeSingle();

      let profile: any = profileResult.data;
      let profileError = profileResult.error;

      if (isMissingAppAccessColumnError(profileError)) {
        const fallbackResult = await supabase
          .from("profiles")
          .select("role, is_super_teacher")
          .eq("id", user.id)
          .maybeSingle();

        profile = fallbackResult.data;
        profileError = fallbackResult.error;
      }

      if (profileError) {
        console.error("Error loading Story Notes profile:", profileError);
      }

      const role = (profile?.role as ProfileRole | null) ?? "member";
      const isSuperTeacher = role === "super_teacher" || isSuperTeacherFlag(profile?.is_super_teacher);

      const appAccessStatus = getAppAccessStatus({
        role: isSuperTeacher ? "super_teacher" : role,
        app_access_type: profile?.app_access_type ?? null,
        app_access_expires_at: profile?.app_access_expires_at ?? null,
      });

      const featureAccess = getFeatureAccess({
        role: isSuperTeacher ? "super_teacher" : role,
        isSuperTeacher: profile?.is_super_teacher,
        hasFullAccess: appAccessStatus.hasFullAccess,
        isTrialActive: appAccessStatus.reason === "trial",
      });

      const canUseStoryNotes = featureAccess.canUseStoryNotes;
      if (!canUseStoryNotes) {
        const copy = getFullAccessRequiredCopy("story_notes");
        setAccessMessage(copy.message);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_books")
        .select(
          `
          id,
          user_id,
          books (
            title,
            title_reading,
            author,
            cover_url,
            language_code
          )
        `
        )
        .eq("id", userBookId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("Error loading Story Notes book:", error);
        setAccessMessage("This book could not be found.");
        setLoading(false);
        return;
      }

      if (!data) {
        setAccessMessage("You do not have access to this book.");
        setLoading(false);
        return;
      }

      const loadedRow = data as unknown as UserBookRow;
      let canAccessBook = loadedRow.user_id === user.id || isSuperTeacher || role === "admin";

      if (!canAccessBook && role === "teacher") {
        const { data: teacherStudentLink, error: teacherStudentError } = await supabase
          .from("teacher_students")
          .select("id")
          .eq("teacher_id", user.id)
          .eq("student_id", loadedRow.user_id)
          .limit(1)
          .maybeSingle();

        if (teacherStudentError) {
          console.error("Error checking Story Notes teacher access:", teacherStudentError);
        }

        canAccessBook = !!teacherStudentLink;
      }

      if (!canAccessBook) {
        setAccessMessage("You do not have access to this book.");
        setLoading(false);
        return;
      }

      if (loadedRow.books?.language_code === "en") {
        setAccessMessage("Story Notes are available for Japanese books.");
        setLoading(false);
        return;
      }

      setRow(loadedRow);
      await Promise.all([
        loadCharacters(loadedRow.id),
        loadChapterSummaries(loadedRow.id),
      ]);

      if (!cancelled) {
        setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [userBookId]);

  async function loadCharacters(id: string) {
    const { data, error } = await supabase
      .from("user_book_characters")
      .select("id, user_book_id, name, reading, role, first_seen_page_number, notes, sort_order, created_at, updated_at")
      .eq("user_book_id", id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading characters:", error);
      setCharacters([]);
      return;
    }

    setCharacters((data as Character[]) ?? []);
  }

  async function loadChapterSummaries(id: string) {
    const { data, error } = await supabase
      .from("user_book_chapter_summaries")
      .select("id, user_book_id, chapter_number, chapter_title, summary, sort_order, created_at, updated_at")
      .eq("user_book_id", id)
      .order("sort_order", { ascending: true })
      .order("chapter_number", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading chapter summaries:", error);
      setChapterSummaries([]);
      return;
    }

    setChapterSummaries((data as ChapterSummary[]) ?? []);
  }

  function startEditingCharacter(id: string) {
    setEditingCharacterIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  function stopEditingCharacter(id: string) {
    setEditingCharacterIds((prev) => prev.filter((x) => x !== id));
  }

  function markCharacterSaved(id: string) {
    setSavedCharacterIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    window.setTimeout(() => {
      setSavedCharacterIds((prev) => prev.filter((x) => x !== id));
    }, 1800);
  }

  function addCharacter() {
    if (!row?.id) return;
    const newId = `new-character-${Date.now()}`;

    setCharacters((prev) => [
      ...prev,
      {
        id: newId,
        user_book_id: row.id,
        name: "",
        reading: "",
        role: "",
        first_seen_page_number: null,
        notes: "",
        sort_order: prev.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    setShowCharacters(true);
    startEditingCharacter(newId);
  }

  function updateCharacter(id: string, field: keyof Character, value: string | number | null) {
    setCharacters((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  }

  async function saveCharacter(item: Character) {
    if (!row?.id) return;

    const payload = {
      user_book_id: row.id,
      name: item.name.trim(),
      reading: item.reading?.trim() || null,
      role: item.role?.trim() || null,
      first_seen_page_number:
        typeof item.first_seen_page_number === "number" &&
        Number.isFinite(item.first_seen_page_number)
          ? Math.max(1, Math.trunc(item.first_seen_page_number))
          : null,
      notes: item.notes?.trim() || null,
      sort_order: item.sort_order ?? 0,
    };

    if (!payload.name) {
      alert("Please enter a character name before saving.");
      return;
    }

    setSavingCharacterIds((prev) => [...prev, item.id]);

    if (item.id.startsWith("new-character-")) {
      const oldId = item.id;
      const { data, error } = await supabase
        .from("user_book_characters")
        .insert(payload)
        .select("id, user_book_id, name, reading, role, first_seen_page_number, notes, sort_order, created_at, updated_at")
        .single();

      setSavingCharacterIds((prev) => prev.filter((x) => x !== oldId));

      if (error) {
        console.error("Error creating character:", error);
        alert(`Could not save character.\n${error.message}`);
        return;
      }

      const saved = data as Character;
      setCharacters((prev) => prev.map((x) => (x.id === oldId ? saved : x)));
      setEditingCharacterIds((prev) => prev.map((x) => (x === oldId ? saved.id : x)));
      stopEditingCharacter(saved.id);
      markCharacterSaved(saved.id);
      return;
    }

    const { data, error } = await supabase
      .from("user_book_characters")
      .update(payload)
      .eq("id", item.id)
      .select("id, user_book_id, name, reading, role, first_seen_page_number, notes, sort_order, created_at, updated_at")
      .single();

    setSavingCharacterIds((prev) => prev.filter((x) => x !== item.id));

    if (error) {
      console.error("Error updating character:", error);
      alert(`Could not update character.\n${error.message}`);
      return;
    }

    const saved = data as Character;
    setCharacters((prev) => prev.map((x) => (x.id === item.id ? saved : x)));
    stopEditingCharacter(saved.id);
    markCharacterSaved(saved.id);
  }

  async function deleteCharacter(id: string) {
    if (id.startsWith("new-character-")) {
      setCharacters((prev) => prev.filter((x) => x.id !== id));
      setSavingCharacterIds((prev) => prev.filter((x) => x !== id));
      setSavedCharacterIds((prev) => prev.filter((x) => x !== id));
      return;
    }

    const ok = window.confirm("Delete this character?");
    if (!ok) return;

    const { error } = await supabase.from("user_book_characters").delete().eq("id", id);

    if (error) {
      console.error("Error deleting character:", error);
      alert("Could not delete character.");
      return;
    }

    setCharacters((prev) => prev.filter((x) => x.id !== id));
    setSavingCharacterIds((prev) => prev.filter((x) => x !== id));
    setSavedCharacterIds((prev) => prev.filter((x) => x !== id));
    stopEditingCharacter(id);
  }

  function startEditingChapter(id: string) {
    setEditingChapterIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  function stopEditingChapter(id: string) {
    setEditingChapterIds((prev) => prev.filter((x) => x !== id));
  }

  function markChapterSaved(id: string) {
    setSavedChapterIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    window.setTimeout(() => {
      setSavedChapterIds((prev) => prev.filter((x) => x !== id));
    }, 1800);
  }

  function addChapterSummary() {
    if (!row?.id) return;
    const newId = `new-${Date.now()}`;

    setChapterSummaries((prev) => [
      ...prev,
      {
        id: newId,
        user_book_id: row.id,
        chapter_number: 1,
        chapter_title: "",
        summary: "",
        sort_order: prev.length > 0 ? Math.max(...prev.map((x) => x.sort_order ?? 0)) + 1 : 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    setShowChapterSummaries(true);
    startEditingChapter(newId);
  }

  function updateChapterSummary(id: string, field: keyof ChapterSummary, value: string) {
    setChapterSummaries((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]:
                field === "chapter_number" || field === "sort_order"
                  ? value === ""
                    ? null
                    : Number(value)
                  : value,
            }
          : item
      )
    );
  }

  async function saveChapterSummary(item: ChapterSummary) {
    if (!row?.id) return;

    const payload = {
      user_book_id: row.id,
      chapter_number: item.chapter_number,
      chapter_title: item.chapter_title?.trim() || null,
      summary: item.summary.trim(),
      sort_order: item.sort_order ?? 0,
    };

    if (!payload.summary) {
      alert("Please write a short summary before saving.");
      return;
    }

    setSavingChapterIds((prev) => [...prev, item.id]);

    if (item.id.startsWith("new-")) {
      const oldId = item.id;
      const { data, error } = await supabase
        .from("user_book_chapter_summaries")
        .insert(payload)
        .select("id, user_book_id, chapter_number, chapter_title, summary, sort_order, created_at, updated_at")
        .single();

      setSavingChapterIds((prev) => prev.filter((x) => x !== oldId));

      if (error) {
        console.error("Error creating chapter summary:", error);
        alert("Could not save chapter summary.");
        return;
      }

      const saved = data as ChapterSummary;
      setChapterSummaries((prev) => prev.map((x) => (x.id === oldId ? saved : x)));
      setEditingChapterIds((prev) => prev.map((x) => (x === oldId ? saved.id : x)));
      stopEditingChapter(saved.id);
      markChapterSaved(saved.id);
      return;
    }

    const { data, error } = await supabase
      .from("user_book_chapter_summaries")
      .update(payload)
      .eq("id", item.id)
      .select("id, user_book_id, chapter_number, chapter_title, summary, sort_order, created_at, updated_at")
      .single();

    setSavingChapterIds((prev) => prev.filter((x) => x !== item.id));

    if (error) {
      console.error("Error updating chapter summary:", error);
      alert("Could not update chapter summary.");
      return;
    }

    const saved = data as ChapterSummary;
    setChapterSummaries((prev) => prev.map((x) => (x.id === item.id ? saved : x)));
    stopEditingChapter(saved.id);
    markChapterSaved(saved.id);
  }

  async function deleteChapterSummary(id: string) {
    if (id.startsWith("new-")) {
      setChapterSummaries((prev) => prev.filter((x) => x.id !== id));
      setEditingChapterIds((prev) => prev.filter((x) => x !== id));
      setSavingChapterIds((prev) => prev.filter((x) => x !== id));
      setSavedChapterIds((prev) => prev.filter((x) => x !== id));
      return;
    }

    const ok = window.confirm("Delete this chapter summary?");
    if (!ok) return;

    const { error } = await supabase
      .from("user_book_chapter_summaries")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting chapter summary:", error);
      alert("Could not delete chapter summary.");
      return;
    }

    setChapterSummaries((prev) => prev.filter((x) => x.id !== id));
    setEditingChapterIds((prev) => prev.filter((x) => x !== id));
    setSavingChapterIds((prev) => prev.filter((x) => x !== id));
    setSavedChapterIds((prev) => prev.filter((x) => x !== id));
  }

  function startEditingSettingItem(id: string) {
    setEditingSettingIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  function stopEditingSettingItem(id: string) {
    setEditingSettingIds((prev) => prev.filter((x) => x !== id));
  }

  function addSettingItem() {
    if (!row?.id) return;
    const newItem: SettingItem = {
      id: crypto.randomUUID(),
      user_book_id: row.id,
      title: "",
      details: "",
      sort_order: settingItems.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setSettingItems((prev) => [...prev, newItem]);
    startEditingSettingItem(newItem.id);
  }

  function updateSettingItem(id: string, field: keyof SettingItem, value: string) {
    setSettingItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  }

  async function saveSettingItem(item: SettingItem) {
    setSavingSettingIds((prev) => [...prev, item.id]);
    setSavingSettingIds((prev) => prev.filter((x) => x !== item.id));
    stopEditingSettingItem(item.id);
    setSavedSettingIds((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]));
    window.setTimeout(() => {
      setSavedSettingIds((prev) => prev.filter((x) => x !== item.id));
    }, 1800);
  }

  async function deleteSettingItem(id: string) {
    setSettingItems((prev) => prev.filter((x) => x.id !== id));
  }

  function startEditingCulturalItem(id: string) {
    setEditingCulturalIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  function stopEditingCulturalItem(id: string) {
    setEditingCulturalIds((prev) => prev.filter((x) => x !== id));
  }

  function addCulturalItem() {
    if (!row?.id) return;
    const newItem: CulturalItem = {
      id: crypto.randomUUID(),
      user_book_id: row.id,
      title: "",
      details: "",
      sort_order: culturalItems.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setCulturalItems((prev) => [...prev, newItem]);
    startEditingCulturalItem(newItem.id);
  }

  function updateCulturalItem(id: string, field: keyof CulturalItem, value: string) {
    setCulturalItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  }

  async function saveCulturalItem(item: CulturalItem) {
    setSavingCulturalIds((prev) => [...prev, item.id]);
    setSavingCulturalIds((prev) => prev.filter((x) => x !== item.id));
    stopEditingCulturalItem(item.id);
    setSavedCulturalIds((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]));
    window.setTimeout(() => {
      setSavedCulturalIds((prev) => prev.filter((x) => x !== item.id));
    }, 1800);
  }

  async function deleteCulturalItem(id: string) {
    setCulturalItems((prev) => prev.filter((x) => x.id !== id));
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-stone-50 px-6 py-10">
        <div className="mx-auto max-w-5xl rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold text-stone-600">Loading Story Notes...</p>
        </div>
      </main>
    );
  }

  if (!row) {
    return (
      <AccessDeniedMessage
        message={accessMessage || "You do not have access to Story Notes."}
        backHref={userBookId ? `/books/${userBookId}` : "/books"}
        backLabel="Back to Book Hub"
      />
    );
  }

  const book = row.books;

  return (
    <main className="min-h-screen bg-stone-50 p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <Link
          href={`/books/${row.id}`}
          className="inline-flex text-sm font-semibold text-stone-500 hover:text-stone-900"
        >
          &larr; Back to Book Hub
        </Link>

        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {book?.cover_url ? (
              <img
                src={book.cover_url}
                alt={`${book.title ?? "Book"} cover`}
                className="h-28 w-20 shrink-0 rounded-2xl border border-stone-200 object-cover shadow-sm"
              />
            ) : null}

            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-500">
                Story Notes
              </p>
              <h1 className="mt-1 text-3xl font-black text-stone-950">
                {book?.title ?? "Untitled book"}
              </h1>
              {book?.title_reading ? (
                <p className="mt-1 text-sm font-semibold text-stone-500">
                  {book.title_reading}
                </p>
              ) : null}
              {book?.author ? (
                <p className="mt-2 text-sm font-semibold text-stone-700">
                  {book.author}
                </p>
              ) : null}
              <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
                Use this as your personal notebook for the story: characters,
                plot points, settings, and details you want to remember as you
                keep reading.
              </p>
            </div>
          </div>
        </section>

        <StoryTab
          storyTab={storyTab}
          setStoryTab={setStoryTab}
          characters={characters}
          visibleCharacters={visibleCharacters}
          showCharacters={showCharacters}
          setShowCharacters={setShowCharacters}
          charactersReverseOrder={charactersReverseOrder}
          setCharactersReverseOrder={setCharactersReverseOrder}
          editingCharacterIds={editingCharacterIds}
          savingCharacterIds={savingCharacterIds}
          savedCharacterIds={savedCharacterIds}
          addCharacter={addCharacter}
          updateCharacter={updateCharacter}
          startEditingCharacter={startEditingCharacter}
          stopEditingCharacter={stopEditingCharacter}
          saveCharacter={saveCharacter}
          deleteCharacter={deleteCharacter}
          chapterSummaries={chapterSummaries}
          visibleChapterSummaries={visibleChapterSummaries}
          showChapterSummaries={showChapterSummaries}
          setShowChapterSummaries={setShowChapterSummaries}
          chapterReverseOrder={chapterReverseOrder}
          setChapterReverseOrder={setChapterReverseOrder}
          editingChapterIds={editingChapterIds}
          savingChapterIds={savingChapterIds}
          savedChapterIds={savedChapterIds}
          addChapterSummary={addChapterSummary}
          updateChapterSummary={updateChapterSummary}
          startEditingChapter={startEditingChapter}
          stopEditingChapter={stopEditingChapter}
          saveChapterSummary={saveChapterSummary}
          deleteChapterSummary={deleteChapterSummary}
          settingItems={settingItems}
          visibleSettingItems={visibleSettingItems}
          showSettingItems={showSettingItems}
          setShowSettingItems={setShowSettingItems}
          settingReverseOrder={settingReverseOrder}
          setSettingReverseOrder={setSettingReverseOrder}
          editingSettingIds={editingSettingIds}
          savingSettingIds={savingSettingIds}
          savedSettingIds={savedSettingIds}
          addSettingItem={addSettingItem}
          updateSettingItem={updateSettingItem}
          startEditingSettingItem={startEditingSettingItem}
          stopEditingSettingItem={stopEditingSettingItem}
          saveSettingItem={saveSettingItem}
          deleteSettingItem={deleteSettingItem}
          culturalItems={culturalItems}
          visibleCulturalItems={visibleCulturalItems}
          showCulturalItems={showCulturalItems}
          setShowCulturalItems={setShowCulturalItems}
          culturalReverseOrder={culturalReverseOrder}
          setCulturalReverseOrder={setCulturalReverseOrder}
          editingCulturalIds={editingCulturalIds}
          savingCulturalIds={savingCulturalIds}
          savedCulturalIds={savedCulturalIds}
          addCulturalItem={addCulturalItem}
          updateCulturalItem={updateCulturalItem}
          startEditingCulturalItem={startEditingCulturalItem}
          stopEditingCulturalItem={stopEditingCulturalItem}
          saveCulturalItem={saveCulturalItem}
          deleteCulturalItem={deleteCulturalItem}
        />
      </div>
    </main>
  );
}
