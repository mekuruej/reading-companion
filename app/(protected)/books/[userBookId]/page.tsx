// Single Book Hub
//
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getAppAccessStatus } from "@/lib/access/appAccess";
import { getFeatureAccess } from "@/lib/access/featureAccess";
import {
  canUseFullAccessFeature,
  getFullAccessRequiredCopy,
} from "@/lib/access/requireFullAccess";
import BookInfoTab from "./components/tabs/BookInfoTab";
import ReadingTab from "./components/tabs/ReadingTab";
import RatingTab from "./components/tabs/RatingTab";
import TeacherPrepAssignBox from "./components/TeacherPrepAssignBox";
import StoryTab from "./components/tabs/StoryTab";
import BookHubActionGrid from "./components/BookHubActionGrid";
import BookFlagModal from "./components/BookFlagModal";
import { todayYmdAppTimeZone } from "@/lib/timeZone";
import AccessDeniedMessage from "@/components/AccessDeniedMessage";
import BookHubLoadingState from "./components/BookHubLoadingState";
import RemoveFromLibraryDialog from "./components/RemoveFromLibraryDialog";
import BookHubProgressSummary from "./components/BookHubProgressSummary";
import BookHubNotices from "./components/BookHubNotices";
import BookHubTabBar from "./components/BookHubTabBar";
import BookHubHero from "./components/BookHubHero";
import BookHubStatusPanel from "./components/BookHubStatusPanel";
import BookHubActionPrompt from "./components/BookHubActionPrompt";
import WordExplorerModal from "./components/WordExplorerModal";
import Detail from "./components/Detail";
import PersonRow from "./components/PersonRow";
import DateField from "./components/DateField";
import StarRatingField from "./components/StarRatingField";
import DifficultyField from "./components/DifficultyField";
import {
  resolveStudentWorkspaceBackContext,
  type StudentWorkspaceBackContext,
} from "@/lib/teacher/studentWorkspaceContext";

function isMissingSeriesTotalColumnError(error: any) {
  return (
    error?.code === "42703" ||
    error?.code === "PGRST204" ||
    String(error?.message ?? "").includes("series_total")
  );
}

type Book = {
  id: string;
  title: string;
  title_reading: string | null;
  author: string | null;
  author_english_name: string | null;
  translator: string | null;
  translator_english_name: string | null;
  illustrator: string | null;
  illustrator_english_name: string | null;
  publisher_id?: string | null;
  cover_url: string | null;
  genre: string | null;
  book_type: string | null;
  language_code: string | null;
  edition_format: string | null;
  edition_note: string | null;
  published_date: string | null;
  trigger_warnings: string | null;
  page_count: number | null;
  series_number: number | null;
  series_total: number | null;
  isbn: string | null;
  isbn13: string | null;
  publisher: string | null;

  author_image_url: string | null;
  translator_image_url: string | null;
  illustrator_image_url: string | null;
  publisher_image_url: string | null;

  author_reading: string | null;
  translator_reading: string | null;
  illustrator_reading: string | null;
  publisher_reading: string | null;

  related_links: any | null;
};

type UserBook = {
  id: string;
  user_id: string;
  book_id: string;
  started_at: string | null;
  finished_at: string | null;
  dnf_at: string | null;
  dnf_reason: string | null;
  dnf_note: string | null;
  would_retry: string | null;
  notes: string | null;
  my_review: string | null;
  reader_advice: string | null;

  rating_overall: number | null;
  rating_recommend: number | null;
  rating_difficulty: number | null;
  teacher_student_use_rating: number | null;
  reader_level: string | null;
  recommended_level: string | null;
  favorite_quotes: string | null;
  memorable_words: string | null;

  format_type: string | null;
  progress_mode: string | null;
  show_page_numbers: boolean | null;
  is_teacher_prep?: boolean | null;
  teacher_prep_kind?: string | null;
  prepared_by?: string | null;
  source_user_book_id?: string | null;
  assigned_from_prep_at?: string | null;

  books: Book | null;
};

type LookupRow = {
  surface?: string | null;
  meaning?: string | null;
  page_number?: number | null;
  chapter_number?: number | null;
  chapter_name?: string | null;
  created_at?: string | null;
};

type ReadingSession = {
  id: string;
  user_book_id: string;
  read_on: string;
  start_page: number | null;
  end_page: number | null;
  minutes_read: number | null;
  is_filler: boolean;
  created_at: string;
  session_mode: string | null;
};

type HubTab = "bookInfo" | "reading" | "story" | "reflection";
type EditingPanel =
  | HubTab
  | "bookInfoDetails"
  | "bookInfoPeople"
  | "bookInfoLinks"
  | "bookInfoCopy"
  | "communityGenres"
  | "communityContentNotes";
type ProfileRole = "teacher" | "member" | "student" | "super_teacher";

type Character = {
  id: string;
  user_book_id: string;
  name: string;
  reading: string | null;
  role: string | null;
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

type KanjiMapRow = {
  id: number;
  vocabulary_cache_id: number;
  kanji: string;
  kanji_position: number;
  reading_type: "on" | "kun" | "other" | null;
  base_reading: string | null;
  realized_reading: string | null;
};

type VocabCacheQueueRow = {
  id: number;
  userBookWordId: string;
  vocabularyCacheId: number | null;
  surface: string;
  reading: string;
  jlpt: string | null;
  created_at: string;
  enrichmentStatus: "missing" | "partial" | "ready";
  vocabulary_kanji_map: KanjiMapRow[] | null;
};

type CommunityGenreRow = {
  genre: string;
  user_id: string;
};

type CommunityContentNoteRow = {
  content_note: string;
  user_id: string;
};

type SavedKanjiReading = {
  kanji: string;
  reading_type: "on" | "kun" | "other" | null;
  base_reading: string | null;
  realized_reading: string | null;
  updated_at?: string | null;
};

type SessionKanjiReading = {
  reading_type: "on" | "kun" | "other" | null;
  base: string | null;
  realized: string | null;
};

function hasKanji(text: string) {
  return /[\p{Script=Han}]/u.test(text);
}

async function generateVocabularyKanjiMap(vocabularyCacheId: number) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const response = await fetch("/api/vocabulary-kanji-map/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
    },
    body: JSON.stringify({ vocabulary_cache_id: vocabularyCacheId }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    console.error("Could not generate vocabulary kanji map:", data?.error ?? response.status);
  }
}

const BOOK_TYPE_OPTIONS = [
  { value: "picture_book", label: "Picture Book" },
  { value: "early_reader", label: "Early Reader" },
  { value: "chapter_book", label: "Chapter Book" },
  { value: "middle_grade", label: "Middle Grade" },
  { value: "ya", label: "YA" },
  { value: "novel", label: "Novel" },
  { value: "short_story", label: "Short Story" },
  { value: "manga", label: "Manga" },
  { value: "nonfiction", label: "Nonfiction" },
  { value: "essay", label: "Essay" },
  { value: "memoir", label: "Memoir" },
  { value: "textbook", label: "Textbook" },
  { value: "other", label: "Other" },
] as const;

const GENRE_OPTIONS = [
  { value: "fantasy", label: "Fantasy" },
  { value: "science_fiction", label: "Science Fiction" },
  { value: "mystery", label: "Mystery" },
  { value: "thriller", label: "Thriller" },
  { value: "romance", label: "Romance" },
  { value: "historical_fiction", label: "Historical Fiction" },
  { value: "literary_fiction", label: "Literary Fiction" },
  { value: "adventure", label: "Adventure" },
  { value: "horror", label: "Horror" },
  { value: "humor", label: "Humor" },
  { value: "slice_of_life", label: "Slice of Life" },
  { value: "memoir", label: "Memoir" },
  { value: "biography", label: "Biography" },
  { value: "history", label: "History" },
  { value: "self_help", label: "Self-Help" },
  { value: "language_learning", label: "Language Learning" },
  { value: "education", label: "Education" },
  { value: "essays", label: "Essays" },
  { value: "reference", label: "Reference" },
  { value: "general_nonfiction", label: "General Nonfiction" },
  { value: "other", label: "Other" },
] as const;

const DIFFICULTY_OPTIONS = [
  { value: 1, label: "Very easy" },
  { value: 1.5, label: "Easy" },
  { value: 2, label: "Pretty comfortable" },
  { value: 2.5, label: "Mostly manageable" },
  { value: 3, label: "Challenging but manageable" },
  { value: 3.5, label: "A real stretch" },
  { value: 4, label: "Hard, but doable" },
  { value: 4.5, label: "Very difficult" },
  { value: 5, label: "Extremely difficult" },
] as const;

function safeDate(s: string | null) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function linksToText(links: any): string {
  if (!links) return "";
  if (!Array.isArray(links)) return "";

  return links
    .map((x) => {
      if (typeof x === "string") return x;
      if (x && typeof x === "object") {
        const label = (x.label ?? x.url ?? "").toString();
        const url = (x.url ?? "").toString();
        return url ? `${label} | ${url}` : label;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function parseLinks(text: string) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  return lines.map((line) => {
    const parts = line.split("|").map((p) => p.trim());
    if (parts.length === 1) return { label: parts[0], url: parts[0] };
    return { label: parts[0], url: parts.slice(1).join("|") };
  });
}

function displayLinkLabel(l: any) {
  const rawLabel =
    typeof l === "object" && l != null ? (l.label ?? "").toString().trim() : "";
  const rawUrl =
    typeof l === "string"
      ? l
      : typeof l === "object" && l != null
        ? (l.url ?? "").toString()
        : "";

  if (rawLabel && rawLabel !== rawUrl) return rawLabel;

  const safeUrl = rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
    ? rawUrl
    : rawUrl
      ? `https://${rawUrl}`
      : "";

  if (safeUrl) {
    try {
      const hostname = new URL(safeUrl).hostname.replace(/^www\./, "").toLowerCase();

      if (hostname.includes("amazon.")) return "Amazon";
      if (hostname.includes("bookwalker.")) return "BookWalker";
      if (hostname.includes("kinokuniya.")) return "Kinokuniya";
      if (hostname.includes("rakuten.")) return "Rakuten Books";
      if (hostname.includes("ebookjapan.")) return "ebookjapan";
      if (hostname.includes("honto.")) return "honto";

      const [firstPart] = hostname.split(".");
      if (firstPart) {
        return firstPart.charAt(0).toUpperCase() + firstPart.slice(1);
      }
    } catch {
      // fall through
    }
  }

  return rawLabel || rawUrl || "Link";
}

function displayLinkUrl(l: any) {
  if (!l) return "";
  if (typeof l === "string") return l;
  if (typeof l === "object") return l.url ?? "";
  return "";
}

function clampRating5(n: number | null) {
  if (n == null || Number.isNaN(n)) return null;

  const clamped = Math.max(1, Math.min(5, n));

  // Supports quarter-star ratings while keeping values tidy for the DB.
  return Number((Math.round(clamped * 4) / 4).toFixed(2));
}

function formatRating(value: number | null | undefined) {
  if (value == null || Number.isNaN(Number(value))) return "—";

  return Number(value)
    .toFixed(2)
    .replace(/\.00$/, "")
    .replace(/0$/, "");
}

function stars5(value: number | null) {
  if (!value) return "☆☆☆☆☆";

  const v = Math.max(1, Math.min(5, value));
  const rounded = Math.round(v);

  return "★".repeat(rounded) + "☆".repeat(5 - rounded);
}

function ratingDescription(
  descriptions: Record<number, string>,
  value: number | null
) {
  if (!value) return "—";

  return descriptions[value] ?? descriptions[Math.round(value)] ?? "—";
}

function entertainmentRatingText(value: number | null) {
  switch (value) {
    case 5:
      return "Loved it. Highly recommend."
    case 4.75:
      return "Good, solid book. Definitely recommend."
    case 4.5:
      return "Good, solid book. Would most likely recommend."
    case 4.25:
      return "Good, solid book. May recommend."
    case 4:
      return "Good, solid book. Probably wouldn't recommend for certain reasons."
    case 3.75:
      return "Some parts worked; others didn't. Would recommend to specific people."
    case 3.5:
      return "Some parts worked; others didn't. May recommend."
    case 3.25:
      return "Some parts worked; others didn't. Would only recommend with reservations."
    case 3:
      return "Some parts worked; some parts didn't. Definitely wouldn't recommend."
    case 2.5:
      return "Some parts were okay, but overall, not for me."
    case 2:
      return "Definitely not for me, but the author tried."
    case 1.5:
      return "Definitely not for me. You should steer clear too."
    case 1:
      return "Hated it."
    default:
      return "—"
  }
}

function languageLearningRatingText(value: number | null) {
  switch (value) {
    case 5:
      return "This is a learner’s dream come true!"
    case 4:
      return "Has a lot of good material in there."
    case 3:
      return "You can learn some stuff, but nothing special."
    case 2:
      return "Not so much useful language material."
    case 1:
      return "I didn’t get anything out of it."
    default:
      return "—"
  }
}

function formatTypeLabel(value: string | null | undefined) {
  switch (value) {
    case "paperback":
      return "Paperback";
    case "hardcover":
      return "Hardcover";
    case "ebook":
      return "eBook";
    case "audiobook":
      return "Audiobook";
    case "other":
      return "Other";
    default:
      return "—";
  }
}

function bookTypeLabel(value: string | null | undefined) {
  return (
    BOOK_TYPE_OPTIONS.find((opt) => opt.value === value)?.label ?? "—"
  );
}

function isDuplicateBookIsbnError(error: unknown) {
  const code = (error as { code?: string } | null)?.code;
  const message = String((error as { message?: string } | null)?.message ?? "");

  return (
    code === "23505" &&
    (message.includes("books_isbn13_unique") ||
      message.includes("books_isbn_unique") ||
      message.toLowerCase().includes("isbn"))
  );
}

function progressModeLabel(value: string | null | undefined) {
  switch (value) {
    case "pages":
      return "Pages";
    case "percent":
      return "Percent";
    case "chapters":
      return "Chapters";
    case "time":
      return "Time";
    default:
      return "—";
  }
}

function formatMinutes(total: number | null) {
  if (!total || total <= 0) return "—";

  const hours = Math.floor(total / 60);
  const minutes = total % 60;

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function formatTimer(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function pageToPercent(page: number | null, pageCount: number | null) {
  if (page == null || !pageCount || pageCount <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((page / pageCount) * 100)));
}

function percentToPage(percent: number | null, pageCount: number | null) {
  if (percent == null || !pageCount || pageCount <= 0) return null;
  const clamped = Math.max(0, Math.min(100, percent));
  return Math.max(1, Math.min(pageCount, Math.round((clamped / 100) * pageCount)));
}

function genreLabel(value: string | null | undefined) {
  if (!value) return "—";
  return (
    GENRE_OPTIONS.find((opt) => opt.value === value)?.label ??
    value.replaceAll("_", " ")
  );
}

function parseCommunityTags(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function dedupeCommunityTags(tags: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const tag of tags) {
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }

  return out;
}

function joinCommunityTags(tags: string[]) {
  return dedupeCommunityTags(tags).join(", ");
}

function hiraToKata(text: string) {
  return text.replace(/[\u3041-\u3096]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) + 0x60)
  );
}

function normalizeKanjiQueueKey(surface: string | null | undefined, reading: string | null | undefined) {
  return `${(surface ?? "").trim()}|||${(reading ?? "").trim()}`;
}

function isSuperTeacherFlag(value: unknown) {
  return value === true || value === "true";
}

function FullAccessBookHubTabPanel({
  feature,
  title,
  message,
}: {
  feature: "vocab_tools" | "story_notes";
  title: string;
  message: string;
}) {
  const copy = getFullAccessRequiredCopy(feature);

  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-400">
        Full access feature
      </p>

      <h2 className="mt-2 text-2xl font-black text-stone-950">{title}</h2>

      <p className="mt-3 text-sm leading-6 text-stone-600">{copy.message}</p>

      <p className="mt-3 text-sm leading-6 text-stone-600">{message}</p>

      <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm leading-6 text-stone-600">
        You can still use this Book Hub for Book Info, Reading Sessions, and
        Reading Reflection.
      </div>
    </div>
  );
}

export default function BookHubPage() {
  const router = useRouter();
  const params = useParams<{ userBookId: string }>();
  const searchParams = useSearchParams();
  const userBookId = params?.userBookId;

  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<UserBook | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showBookFlagModal, setShowBookFlagModal] = useState(false);
  const [bookFlagNote, setBookFlagNote] = useState("");
  const [isSavingBookFlag, setIsSavingBookFlag] = useState(false);
  const [showRemoveLibraryConfirm, setShowRemoveLibraryConfirm] = useState(false);
  const [isRemovingFromLibrary, setIsRemovingFromLibrary] = useState(false);
  const [removeLibraryError, setRemoveLibraryError] = useState<string | null>(null);

  const [myRole, setMyRole] = useState<ProfileRole>("member");
  const [isSuperTeacher, setIsSuperTeacher] = useState(false);
  const [isLinkedStudentToAnyTeacher, setIsLinkedStudentToAnyTeacher] = useState(false);
  const [profileLevel, setProfileLevel] = useState<string>("");
  const [bookHubOwnerName, setBookHubOwnerName] = useState<string>("");
  const [studentWorkspaceBackContext, setStudentWorkspaceBackContext] =
    useState<StudentWorkspaceBackContext | null>(null);

  const [canUseStoryNotes, setCanUseStoryNotes] = useState(false);
  const [canUseCuriosityReading, setCanUseCuriosityReading] = useState(false);
  const [canUseSavedWordReading, setCanUseSavedWordReading] = useState(false);
  const [canUseStudyFlashcards, setCanUseStudyFlashcards] = useState(false);
  const [canUseVocabularyList, setCanUseVocabularyList] = useState(false);
  const [canSeeVocabularySummary, setCanSeeVocabularySummary] = useState(false);

  const isTeacher = myRole === "teacher";
  const isTeacherContext = isTeacher || isSuperTeacher;
  const canEditBookInfo = isSuperTeacher;

  const [editingTab, setEditingTab] = useState<EditingPanel | null>(null);
  const [saving, setSaving] = useState(false);

  const [activeTab, setActiveTab] = useState<HubTab>("reflection");
  const [uniqueLookupCount, setUniqueLookupCount] = useState<number | null>(null);
  const [lastSavedWord, setLastSavedWord] = useState<string>("");
  const [lastSavedWordPage, setLastSavedWordPage] = useState<number | null>(null);
  const [lastSavedChapter, setLastSavedChapter] = useState<string>("");

  const [startedAt, setStartedAt] = useState<string>("");
  const [finishedAt, setFinishedAt] = useState<string>("");
  const [dnfAt, setDnfAt] = useState<string>("");
  const [dnfReason, setDnfReason] = useState<string>("");
  const [dnfNote, setDnfNote] = useState<string>("");
  const [wouldRetry, setWouldRetry] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [myReview, setMyReview] = useState<string>("");
  const [readerAdvice, setReaderAdvice] = useState<string>("");

  const [ratingOverall, setRatingOverall] = useState<string>("");
  const [ratingRecommend, setRatingRecommend] = useState<string>("");
  const [ratingDifficulty, setRatingDifficulty] = useState<string>("");
  const [teacherStudentUseRating, setTeacherStudentUseRating] = useState<string>("");

  const [readerLevel, setReaderLevel] = useState<string>("");
  const [recommendedLevel, setRecommendedLevel] = useState<string>("");

  const [genre, setGenre] = useState<string>("");
  const [titleReading, setTitleReading] = useState<string>("");
  const [bookType, setBookType] = useState<string>("");
  const [editionFormat, setEditionFormat] = useState<string>("");
  const [editionNote, setEditionNote] = useState<string>("");
  const [triggerWarnings, setTriggerWarnings] = useState<string>("");
  const [savedCommunityGenres, setSavedCommunityGenres] = useState<string>("");
  const [savedCommunityContentNotes, setSavedCommunityContentNotes] = useState<string>("");
  const [sharedGenres, setSharedGenres] = useState<{ value: string; count: number }[]>([]);
  const [sharedContentNotes, setSharedContentNotes] = useState<{ value: string; count: number }[]>([]);
  const [publishedDate, setPublishedDate] = useState("");
  const [pageCount, setPageCount] = useState<string>("");
  const [seriesNumber, setSeriesNumber] = useState<string>("");
  const [seriesTotal, setSeriesTotal] = useState<string>("");
  const [isbn, setIsbn] = useState<string>("");
  const [isbn13, setIsbn13] = useState<string>("");

  const [authorName, setAuthorName] = useState<string>("");
  const [translatorName, setTranslatorName] = useState<string>("");
  const [illustratorName, setIllustratorName] = useState<string>("");
  const [publisherName, setPublisherName] = useState<string>("");
  const [authorEnglishName, setAuthorEnglishName] = useState<string>("");
  const [translatorEnglishName, setTranslatorEnglishName] = useState<string>("");
  const [illustratorEnglishName, setIllustratorEnglishName] = useState<string>("");

  const [publisherReading, setPublisherReading] = useState<string>("");

  const [coverUrl, setCoverUrl] = useState<string>("");
  const [authorImg, setAuthorImg] = useState<string>("");
  const [translatorImg, setTranslatorImg] = useState<string>("");
  const [illustratorImg, setIllustratorImg] = useState<string>("");
  const [publisherImg, setPublisherImg] = useState<string>("");
  const [publisherEnglishName, setPublisherEnglishName] = useState("");
  const [selectedPublisherId, setSelectedPublisherId] = useState<string | null>(null);
  const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null);
  const [selectedTranslatorId, setSelectedTranslatorId] = useState<string | null>(null);
  const [selectedIllustratorId, setSelectedIllustratorId] = useState<string | null>(null);
  const [requireSharedAuthorRecord, setRequireSharedAuthorRecord] = useState(false);
  const [requireSharedTranslatorRecord, setRequireSharedTranslatorRecord] = useState(false);
  const [requireSharedIllustratorRecord, setRequireSharedIllustratorRecord] = useState(false);
  const [requireSharedPublisherRecord, setRequireSharedPublisherRecord] = useState(false);

  const [authorReading, setAuthorReading] = useState<string>("");
  const [translatorReading, setTranslatorReading] = useState<string>("");
  const [illustratorReading, setIllustratorReading] = useState<string>("");

  const [openKanjiWordIds, setOpenKanjiWordIds] = useState<Record<number, boolean>>({});
  const [editingKanjiRows, setEditingKanjiRows] = useState<Record<number, KanjiMapRow[]>>({});
  const [savingKanjiWordId, setSavingKanjiWordId] = useState<number | null>(null);

  const [linksText, setLinksText] = useState<string>("");

  const [settingItems, setSettingItems] = useState<SettingItem[]>([]);
  const [showSettingItems, setShowSettingItems] = useState(true);

  const [settingReverseOrder, setSettingReverseOrder] = useState(false);
  const [editingSettingIds, setEditingSettingIds] = useState<string[]>([]);
  const [savingSettingIds, setSavingSettingIds] = useState<string[]>([]);
  const [savedSettingIds, setSavedSettingIds] = useState<string[]>([]);

  const [favoriteQuotes, setFavoriteQuotes] = useState("");
  const [memorableWords, setMemorableWords] = useState("");

  const visibleSettingItems = useMemo(() => {
    const copy = [...settingItems];
    return settingReverseOrder ? copy.reverse() : copy;
  }, [settingItems, settingReverseOrder]);

  function startEditingSettingItem(id: string) {
    setEditingSettingIds((prev) =>
      prev.includes(id) ? prev : [...prev, id]
    );
  }

  function stopEditingSettingItem(id: string) {
    setEditingSettingIds((prev) =>
      prev.filter((x) => x !== id)
    );
  }

  const [characters, setCharacters] = useState<Character[]>([]);
  const [showCharacters, setShowCharacters] = useState(true);

  const [charactersReverseOrder, setCharactersReverseOrder] = useState(false);
  const [editingCharacterIds, setEditingCharacterIds] = useState<string[]>([]);
  const [savingCharacterIds, setSavingCharacterIds] = useState<string[]>([]);
  const [savedCharacterIds, setSavedCharacterIds] = useState<string[]>([]);

  const visibleCharacters = useMemo(() => {
    const copy = [...characters];
    return charactersReverseOrder ? copy.reverse() : copy;
  }, [characters, charactersReverseOrder]);

  function startEditingCharacter(id: string) {
    setEditingCharacterIds((prev) =>
      prev.includes(id) ? prev : [...prev, id]
    );
  }

  function stopEditingCharacter(id: string) {
    setEditingCharacterIds((prev) =>
      prev.filter((x) => x !== id)
    );
  }

  const [culturalItems, setCulturalItems] = useState<CulturalItem[]>([]);
  const [showCulturalItems, setShowCulturalItems] = useState(true);

  const [culturalReverseOrder, setCulturalReverseOrder] = useState(false);
  const [editingCulturalIds, setEditingCulturalIds] = useState<string[]>([]);
  const [savingCulturalIds, setSavingCulturalIds] = useState<string[]>([]);
  const [savedCulturalIds, setSavedCulturalIds] = useState<string[]>([]);

  const visibleCulturalItems = useMemo(() => {
    const copy = [...culturalItems];
    return culturalReverseOrder ? copy.reverse() : copy;
  }, [culturalItems, culturalReverseOrder]);

  function startEditingCulturalItem(id: string) {
    setEditingCulturalIds((prev) =>
      prev.includes(id) ? prev : [...prev, id]
    );
  }

  function stopEditingCulturalItem(id: string) {
    setEditingCulturalIds((prev) =>
      prev.filter((x) => x !== id)
    );
  }

  const [savedKanjiDefaults, setSavedKanjiDefaults] = useState<
    Record<string, SessionKanjiReading>
  >({});

  const [readingSessions, setReadingSessions] = useState<ReadingSession[]>([]);
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [sessionDate, setSessionDate] = useState<string>(() =>
    todayYmdAppTimeZone()
  );

  useEffect(() => {
    setSessionDate(todayYmdAppTimeZone());
  }, []);

  const realReadingSessions = useMemo(() => {
    return readingSessions.filter((s) => !s.is_filler);
  }, [readingSessions]);

  const daysRead = useMemo(() => {
    if (!realReadingSessions.length) return null;
    return new Set(realReadingSessions.map((s) => s.read_on)).size;
  }, [realReadingSessions]);

  const coverageReadingSessions = useMemo(() => {
    return readingSessions.filter(
      (s) =>
        (s.session_mode === "fluid" || s.session_mode === "curiosity") &&
        s.start_page != null &&
        s.end_page != null
    );
  }, [readingSessions]);

  const earliestTrackedStartPage = useMemo(() => {
    if (coverageReadingSessions.length === 0) return null;
    return Math.min(...coverageReadingSessions.map((s) => s.start_page));
  }, [coverageReadingSessions]);

  const furthestTrackedPage = useMemo(() => {
    if (coverageReadingSessions.length === 0) return null;
    return Math.max(...coverageReadingSessions.map((s) => s.end_page));
  }, [coverageReadingSessions]);

  const [userId, setUserId] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [saveNoticeTone, setSaveNoticeTone] = useState<"success" | "warning">("success");
  const [bookOptions, setBookOptions] = useState<
    { id: string; title: string; started_at: string | null; finished_at: string | null; dnf_at: string | null }[]
  >([]);

  const [chapterSummaries, setChapterSummaries] = useState<ChapterSummary[]>([]);
  const [showChapterSummaries, setShowChapterSummaries] = useState(false);
  const [chapterReverseOrder, setChapterReverseOrder] = useState(false);
  const [editingChapterIds, setEditingChapterIds] = useState<string[]>([]);
  const [savingChapterIds, setSavingChapterIds] = useState<string[]>([]);
  const [savedChapterIds, setSavedChapterIds] = useState<string[]>([]);
  const [kanjiMapQueue, setKanjiMapQueue] = useState<VocabCacheQueueRow[]>([]);
  const [kanjiMapLoading, setKanjiMapLoading] = useState(false);
  const [kanjiMapError, setKanjiMapError] = useState<string | null>(null);
  const [storyTab, setStoryTab] = useState<"characters" | "plot" | "setting" | "cultural">("characters");
  const [needsKanjiEnrichmentCount, setNeedsKanjiEnrichmentCount] = useState(0);

  const [sessionStartPage, setSessionStartPage] = useState<string>("");
  const [sessionEndPage, setSessionEndPage] = useState<string>("");
  const [sessionMinutesRead, setSessionMinutesRead] = useState<string>("");
  const [sessionMode, setSessionMode] = useState<"fluid" | "curiosity" | "listening">("fluid");

  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showTimedSessionForm, setShowTimedSessionForm] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timerSaveMessage, setTimerSaveMessage] = useState("");

  const [quickWord, setQuickWord] = useState("");
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);
  const [hideKanjiInReadingSupport, setHideKanjiInReadingSupport] = useState(false);
  const [editingReadingSessionId, setEditingReadingSessionId] = useState<string | null>(null);


  const [showWordExplorer, setShowWordExplorer] = useState(false);
  const [wordExplorerQuery, setWordExplorerQuery] = useState("");
  const [wordExplorerLoading, setWordExplorerLoading] = useState(false);
  const [wordExplorerError, setWordExplorerError] = useState<string | null>(null);
  const [wordExplorerResults, setWordExplorerResults] = useState<any[]>([]);

  const [quickPreview, setQuickPreview] = useState<{
    surface: string;
    cacheSurface: string; // ✅ ADD THIS
    reading: string;
    meanings: string[];
    selectedMeaningIndex: number;
    meaning: string;
    isCustomMeaning: boolean;
    useAlternateSurface: boolean;
    alternateSurface: string;
    page: string;
    chapterNumber: string;
    chapterName: string;
  } | null>(null);

  const [quickSessionWords, setQuickSessionWords] = useState<
    {
      id: string;
      surface: string;
      reading: string;
      meaning: string;
      page: string;
      chapterNumber: string;
      chapterName: string;
    }[]
  >([]);

  const [editingQuickSessionId, setEditingQuickSessionId] = useState<string | null>(null);
  const [editingQuickSessionWord, setEditingQuickSessionWord] = useState<{
    id: string;
    surface: string;
    reading: string;
    meaning: string;
    page: string;
    chapterNumber: string;
    chapterName: string;
  } | null>(null);

  const [defaultVocabPage, setDefaultVocabPage] = useState("");
  const [defaultChapterNumber, setDefaultChapterNumber] = useState("");
  const [defaultChapterName, setDefaultChapterName] = useState("");

  const [formatType, setFormatType] = useState<string>("");
  const [progressMode, setProgressMode] = useState<string>("");
  const [showPageNumbers, setShowPageNumbers] = useState(true);

  const quickWordInputRef = useRef<HTMLInputElement>(null);
  const kanjiReadingMemoryRef = useRef<
    Record<
      string,
      Partial<
        Record<
          "on" | "kun" | "other",
          {
            base: string | null;
            realized: string | null;
          }
        >
      >
    >
  >({});

  const isEditingThisTab = editingTab === activeTab;
  const canEditThisTab =
    activeTab === "bookInfo"
      ? canEditBookInfo
      : true; // members can edit everything else

  const isBookInfoEditingTab =
    editingTab === "bookInfoDetails" ||
    editingTab === "bookInfoPeople" ||
    editingTab === "bookInfoLinks" ||
    editingTab === "bookInfoCopy";
  const isEditingBookInfoDetails = canEditBookInfo && editingTab === "bookInfoDetails";
  const isEditingBookInfoPeople = canEditBookInfo && editingTab === "bookInfoPeople";
  const isEditingBookInfoLinks = canEditBookInfo && editingTab === "bookInfoLinks";
  const isEditingBookInfoCopy = canEditBookInfo && editingTab === "bookInfoCopy";
  const isEditingCommunityGenres = editingTab === "communityGenres";
  const isEditingCommunityContentNotes = editingTab === "communityContentNotes";
  const isEditingReflection = editingTab === "reflection";

  const started = useMemo(() => safeDate(row?.started_at ?? null), [row?.started_at]);
  const finished = useMemo(() => safeDate(row?.finished_at ?? null), [row?.finished_at]);
  const book = row?.books ?? null;

  const visualReadingSessions = useMemo(() => {
    return realReadingSessions.filter(
      (s) => s.session_mode === "fluid" || s.session_mode === "curiosity"
    );
  }, [realReadingSessions]);

  const pageTrackedReadingSessions = useMemo(() => {
    return visualReadingSessions.filter(
      (s) => s.start_page != null && s.end_page != null
    );
  }, [visualReadingSessions]);

  const timedSessions = useMemo(() => {
    return visualReadingSessions.filter((s) => s.minutes_read != null && s.minutes_read > 0);
  }, [visualReadingSessions]);

  const timedPageTrackedSessions = useMemo(() => {
    return timedSessions.filter(
      (s) => s.start_page != null && s.end_page != null
    );
  }, [timedSessions]);

  const totalPagesRead = useMemo(() => {
    return pageTrackedReadingSessions.reduce((sum, s) => {
      return sum + ((s.end_page ?? 0) - (s.start_page ?? 0) + 1);
    }, 0);
  }, [pageTrackedReadingSessions]);

  const totalTimedMinutes = useMemo(() => {
    return timedSessions.reduce((sum, s) => sum + (s.minutes_read ?? 0), 0);
  }, [timedSessions]);

  const totalTimedPages = useMemo(() => {
    return timedPageTrackedSessions.reduce((sum, s) => {
      return sum + ((s.end_page ?? 0) - (s.start_page ?? 0) + 1);
    }, 0);
  }, [timedPageTrackedSessions]);

  const averageMinutesPerPage = useMemo(() => {
    if (!totalTimedPages || !totalTimedMinutes) return null;
    return totalTimedMinutes / totalTimedPages;
  }, [totalTimedMinutes, totalTimedPages]);

  const furthestPage = useMemo(() => {
    const sessionsWithEndPage = realReadingSessions.filter(
      (s) => s.end_page != null
    );

    if (sessionsWithEndPage.length === 0) return null;

    return Math.max(...sessionsWithEndPage.map((s) => s.end_page));
  }, [realReadingSessions]);

  const canFillBeginningPages = useMemo(() => {
    return earliestTrackedStartPage != null && earliestTrackedStartPage > 1;
  }, [earliestTrackedStartPage]);

  const canFillEndingPages = useMemo(() => {
    if (!finished || !book?.page_count || coverageReadingSessions.length === 0) return false;
    return furthestTrackedPage != null && furthestTrackedPage < book.page_count;
  }, [finished, book?.page_count, coverageReadingSessions.length, furthestTrackedPage]);

  const progressPercent = useMemo(() => {
    if (finished) return 100;
    if (!book?.page_count || !furthestPage) return null;
    return Math.min(100, Math.round((furthestPage / book.page_count) * 100));
  }, [book?.page_count, furthestPage, finished]);

  const savedWordsProgressCount =
    canSeeVocabularySummary && uniqueLookupCount != null ? uniqueLookupCount : 0;

  const savedWordsProgressLabel =
    canSeeVocabularySummary
      ? `${savedWordsProgressCount} word${savedWordsProgressCount === 1 ? "" : "s"} saved`
      : "";

  const currentProgressPage = furthestPage ?? (finished && book?.page_count ? book.page_count : null);
  const bookHubProgressLabel = currentProgressPage != null
    ? book?.page_count
      ? `${currentProgressPage} / ${book.page_count}`
      : `Page ${currentProgressPage}`
    : started
      ? "In progress"
      : "Not started";

  const bookHubProgressBarWidth =
    progressPercent != null
      ? `${progressPercent}%`
      : finished
        ? "100%"
        : started
          ? "8%"
          : "0%";
  const bookHubProgressPercentLabel =
    progressPercent != null ? `${progressPercent}% done` : "";
  const bookHubLastSavedWordLabel =
    canSeeVocabularySummary && lastSavedWord.trim() ? lastSavedWord.trim() : "";
  const bookHubLastChapterLabel =
    canSeeVocabularySummary && lastSavedChapter.trim() ? lastSavedChapter.trim() : "";
  const bookHubLastPage = furthestPage ?? (canSeeVocabularySummary ? lastSavedWordPage : null);
  const bookHubLastPageLabel =
    bookHubLastPage != null ? `Page ${bookHubLastPage}` : "";

  const bookHubDaysEngagedLabel = daysRead != null ? String(daysRead) : "—";
  const savedWordsPerPage =
    canSeeVocabularySummary && uniqueLookupCount != null && totalPagesRead > 0
      ? uniqueLookupCount / totalPagesRead
      : null;
  const bookHubSavedWordsPerPageLabel =
    savedWordsPerPage != null ? savedWordsPerPage.toFixed(1) : "—";
  const bookHubAverageMinutesPerPageLabel =
    averageMinutesPerPage != null ? averageMinutesPerPage.toFixed(1) : "—";
  const shouldNudgeStartBook = !started && realReadingSessions.length === 0;
  const shouldNudgeFinishBook =
    !finishedAt && !dnfAt && progressPercent != null && progressPercent >= 98;

  const lastReadDate = useMemo(() => {
    if (visualReadingSessions.length === 0) return null;
    return visualReadingSessions[0]?.read_on ?? null;
  }, [visualReadingSessions]);

  const bookHubProgressSummaryLabel = [
    formatMinutes(totalTimedMinutes),
    canSeeVocabularySummary
      ? `${savedWordsProgressCount} saved word${savedWordsProgressCount === 1 ? "" : "s"}`
      : null,
    `Last read ${lastReadDate ?? "—"}`,
  ]
    .filter((item) => item && item !== "—")
    .join(" · ");


  const visibleReadingSessions = useMemo(() => {
    return showAllSessions ? readingSessions : readingSessions.slice(0, 3);
  }, [readingSessions, showAllSessions]);

  const visibleChapterSummaries = useMemo(() => {
    const sorted = [...chapterSummaries].sort((a, b) => {
      const aSort = a.sort_order ?? 0;
      const bSort = b.sort_order ?? 0;
      if (aSort !== bSort) return aSort - bSort;

      const aChapter = a.chapter_number ?? 0;
      const bChapter = b.chapter_number ?? 0;
      if (aChapter !== bChapter) return aChapter - bChapter;

      return a.created_at.localeCompare(b.created_at);
    });

    return chapterReverseOrder ? sorted.reverse() : sorted;
  }, [chapterSummaries, chapterReverseOrder]);

  function startEditingReadingSession(session: ReadingSession) {
    const usePercentMode =
      (progressMode === "percent" || session.session_mode === "listening") &&
      book?.page_count != null &&
      book.page_count > 0;

    setEditingReadingSessionId(session.id);
    setSessionDate(session.read_on);
    setSessionMode(
      session.session_mode === "curiosity" ||
        session.session_mode === "fluid" ||
        session.session_mode === "listening"
        ? session.session_mode
        : "fluid"
    );
    setSessionStartPage(
      usePercentMode
        ? session.start_page != null
          ? String(pageToPercent(session.start_page, book?.page_count ?? null) ?? "")
          : ""
        : session.start_page != null
          ? String(session.start_page)
          : ""
    );
    setSessionEndPage(
      progressMode === "percent"
        ? session.end_page != null
          ? String(pageToPercent(session.end_page, book?.page_count ?? null) ?? "")
          : ""
        : session.end_page != null
          ? String(session.end_page)
          : ""
    );
    setSessionMinutesRead(
      session.minutes_read != null ? String(session.minutes_read) : ""
    );
    setShowTimedSessionForm(false);
  }

  function cancelEditingReadingSession() {
    setEditingReadingSessionId(null);
    setSessionDate(todayYmdAppTimeZone());
    setSessionStartPage("");
    setSessionEndPage("");
    setSessionMinutesRead("");
    setSessionMode("fluid");
    setShowTimedSessionForm(false);
  }

  function openWordExplorer(word?: string) {
    setWordExplorerQuery(word ?? "");
    setWordExplorerError(null);
    setWordExplorerResults([]);
    setShowWordExplorer(true);
  }

  function addSettingItem() {
    const newItem: SettingItem = {
      id: crypto.randomUUID(),
      user_book_id: userBookId,
      title: "",
      details: "",
      sort_order: settingItems.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setSettingItems((prev) => [...prev, newItem]);
    startEditingSettingItem(newItem.id);
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
        sort_order:
          prev.length > 0
            ? Math.max(...prev.map((x) => x.sort_order ?? 0)) + 1
            : 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    setShowChapterSummaries(true);
    setEditingChapterIds((prev) => [...prev, newId]);
  }

  function updateChapterSummary(
    id: string,
    field: keyof ChapterSummary,
    value: string
  ) {
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


  function updateSettingItem(id: string, field: keyof SettingItem, value: string) {
    setSettingItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  }

  async function saveReadingDates() {
    if (!row?.id) return;

    const started_at = startedAt.trim() ? startedAt.trim() : null;
    const finished_at = finishedAt.trim() ? finishedAt.trim() : null;
    const dnf_at = dnfAt.trim() ? dnfAt.trim() : null;
    const nextDnfReason = dnf_at && dnfReason.trim() ? dnfReason.trim() : null;
    const nextDnfNote = dnf_at && dnfNote.trim() ? dnfNote.trim() : null;
    const nextWouldRetry = dnf_at && wouldRetry.trim() ? wouldRetry.trim() : null;

    const status =
      dnf_at ? "did_not_finish" :
        finished_at ? "finished" :
          started_at ? "reading" :
            "what_to_read";

    const { error } = await supabase
      .from("user_books")
      .update({
        status,
        started_at,
        finished_at,
        dnf_at,
        dnf_reason: nextDnfReason,
        dnf_note: nextDnfNote,
        would_retry: nextWouldRetry,
      })
      .eq("id", row.id);

    if (error) {
      console.error("Error saving reading dates:", error);
      alert(`Could not save reading dates.\n${error.message || "Unknown error"}`);
      return;
    }

    setRow((prev) =>
      prev
        ? {
          ...prev,
          started_at,
          finished_at,
          dnf_at,
          dnf_reason: nextDnfReason,
          dnf_note: nextDnfNote,
          would_retry: nextWouldRetry,
        }
        : prev
    );
    setDnfReason(nextDnfReason ?? "");
    setDnfNote(nextDnfNote ?? "");
    setWouldRetry(nextWouldRetry ?? "");
  }

  async function saveSettingItem(item: SettingItem) {
    setSavingSettingIds((prev) => [...prev, item.id]);

    setSavingSettingIds((prev) => prev.filter((x) => x !== item.id));
    stopEditingSettingItem(item.id);
  }

  async function deleteSettingItem(id: string) {
    setSettingItems((prev) => prev.filter((x) => x.id !== id));
  }

  function addCulturalItem() {
    const newItem: CulturalItem = {
      id: crypto.randomUUID(),
      user_book_id: userBookId,
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
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  }

  async function saveCulturalItem(item: CulturalItem) {
    setSavingCulturalIds((prev) => [...prev, item.id]);

    setSavingCulturalIds((prev) => prev.filter((x) => x !== item.id));
    stopEditingCulturalItem(item.id);
  }

  async function deleteCulturalItem(id: string) {
    setCulturalItems((prev) => prev.filter((x) => x.id !== id));
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
        notes: "",
        sort_order: prev.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    setShowCharacters(true);
  }

  function updateCharacter(id: string, field: keyof Character, value: string) {
    setCharacters((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  }

  function markCharacterSaved(id: string) {
    setSavedCharacterIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    window.setTimeout(() => {
      setSavedCharacterIds((prev) => prev.filter((x) => x !== id));
    }, 1800);
  }

  async function saveNotes() {
    if (!userBookId) return false;

    const { error } = await supabase
      .from("user_books")
      .update({ notes })
      .eq("id", userBookId);

    if (error) {
      console.error("Error saving notes:", error);
      alert("Failed to save notes");
      return false;
    }

    setRow((prev) =>
      prev
        ? {
          ...prev,
          notes: notes || null,
        }
        : prev
    );

    return true;
  }

  async function saveRecommendedLevel() {
    if (!userBookId) return;

    const { error } = await supabase
      .from("user_books")
      .update({
        recommended_level: recommendedLevel || null,
      })
      .eq("id", userBookId);

    if (error) {
      console.error("Error saving recommended level:", error);
      alert("Failed to save level");
      return;
    }

    setRow((prev) =>
      prev
        ? {
          ...prev,
          recommended_level: recommendedLevel || null,
        }
        : prev
    );
  }

  async function saveTeacherStudentUseRating() {
    if (!userBookId) return;

    const rating = teacherStudentUseRating.trim()
      ? clampRating5(Number(teacherStudentUseRating.trim()))
      : null;

    const { error } = await supabase
      .from("user_books")
      .update({
        teacher_student_use_rating: rating,
      })
      .eq("id", userBookId);

    if (error) {
      console.error("Error saving teacher student use rating:", error);
      alert("Failed to save teacher student use rating");
      return;
    }

    setRow((prev) =>
      prev
        ? {
          ...prev,
          teacher_student_use_rating: rating,
        }
        : prev
    );
  }

  async function saveLanguageLearningPotential() {
    if (!userBookId) return;

    const rating = ratingRecommend.trim()
      ? clampRating5(Number(ratingRecommend.trim()))
      : null;

    const { error } = await supabase
      .from("user_books")
      .update({
        rating_recommend: rating,
      })
      .eq("id", userBookId);

    if (error) {
      console.error("Error saving language learning potential:", error);
      alert("Failed to save language learning potential");
      return;
    }

    setRow((prev) =>
      prev
        ? {
          ...prev,
          rating_recommend: rating,
        }
        : prev
    );
  }

  async function loadCommunityContributions(
    bookId: string,
    currentUserId: string | null,
    legacy?: { genre?: string | null; trigger_warnings?: string | null }
  ) {
    if (!bookId) return;

    try {
      const [{ data: genreRows, error: genreError }, { data: noteRows, error: noteError }] =
        await Promise.all([
          supabase.from("book_genres").select("genre, user_id").eq("book_id", bookId),
          supabase
            .from("book_content_notes")
            .select("content_note, user_id")
            .eq("book_id", bookId),
        ]);

      if (genreError) throw genreError;
      if (noteError) throw noteError;

      const genreCounts = new Map<string, number>();
      const noteCounts = new Map<string, number>();

      for (const row of (genreRows ?? []) as CommunityGenreRow[]) {
        if (!row.genre) continue;
        genreCounts.set(row.genre, (genreCounts.get(row.genre) ?? 0) + 1);
      }

      for (const row of (noteRows ?? []) as CommunityContentNoteRow[]) {
        if (!row.content_note) continue;
        noteCounts.set(row.content_note, (noteCounts.get(row.content_note) ?? 0) + 1);
      }

      const myGenres = dedupeCommunityTags(
        ((genreRows ?? []) as CommunityGenreRow[])
          .filter((row) => currentUserId && row.user_id === currentUserId)
          .map((row) => row.genre)
      );

      const myNotes = dedupeCommunityTags(
        ((noteRows ?? []) as CommunityContentNoteRow[])
          .filter((row) => currentUserId && row.user_id === currentUserId)
          .map((row) => row.content_note)
      );

      const sharedGenreList =
        genreCounts.size > 0
          ? Array.from(genreCounts.entries())
            .map(([value, count]) => ({ value, count }))
            .sort((a, b) =>
              b.count === a.count
                ? genreLabel(a.value).localeCompare(genreLabel(b.value))
                : b.count - a.count
            )
          : dedupeCommunityTags(parseCommunityTags(legacy?.genre ?? "")).map((value) => ({
            value,
            count: 1,
          }));

      const sharedNoteList =
        noteCounts.size > 0
          ? Array.from(noteCounts.entries())
            .map(([value, count]) => ({ value, count }))
            .sort((a, b) =>
              b.count === a.count ? a.value.localeCompare(b.value) : b.count - a.count
            )
          : dedupeCommunityTags(parseCommunityTags(legacy?.trigger_warnings ?? "")).map(
            (value) => ({
              value,
              count: 1,
            })
          );

      const myGenreString = joinCommunityTags(myGenres);
      const myNotesString = joinCommunityTags(myNotes);

      setGenre(myGenreString);
      setTriggerWarnings(myNotesString);
      setSavedCommunityGenres(myGenreString);
      setSavedCommunityContentNotes(myNotesString);
      setSharedGenres(sharedGenreList);
      setSharedContentNotes(sharedNoteList);
    } catch (error) {
      console.error("Error loading community contributions:", error);

      const fallbackGenres = joinCommunityTags(parseCommunityTags(legacy?.genre ?? ""));
      const fallbackNotes = joinCommunityTags(parseCommunityTags(legacy?.trigger_warnings ?? ""));

      setGenre(fallbackGenres);
      setTriggerWarnings(fallbackNotes);
      setSavedCommunityGenres(fallbackGenres);
      setSavedCommunityContentNotes(fallbackNotes);
      setSharedGenres(
        dedupeCommunityTags(parseCommunityTags(legacy?.genre ?? "")).map((value) => ({
          value,
          count: 1,
        }))
      );
      setSharedContentNotes(
        dedupeCommunityTags(parseCommunityTags(legacy?.trigger_warnings ?? "")).map((value) => ({
          value,
          count: 1,
        }))
      );
    }
  }

  async function saveCommunityContributions(bookId: string, currentUserId: string | null) {
    if (!bookId || !currentUserId) return;

    const nextGenres = dedupeCommunityTags(parseCommunityTags(genre));
    const nextNotes = dedupeCommunityTags(parseCommunityTags(triggerWarnings));

    const [currentGenreRows, currentNoteRows] = await Promise.all([
      supabase
        .from("book_genres")
        .select("genre")
        .eq("book_id", bookId)
        .eq("user_id", currentUserId),
      supabase
        .from("book_content_notes")
        .select("content_note")
        .eq("book_id", bookId)
        .eq("user_id", currentUserId),
    ]);

    if (currentGenreRows.error) throw currentGenreRows.error;
    if (currentNoteRows.error) throw currentNoteRows.error;

    const existingGenres = new Set((currentGenreRows.data ?? []).map((row: any) => row.genre));
    const existingNotes = new Set(
      (currentNoteRows.data ?? []).map((row: any) => row.content_note)
    );

    const nextGenreSet = new Set(nextGenres);
    const nextNoteSet = new Set(nextNotes);

    const genresToDelete = Array.from(existingGenres).filter((value) => !nextGenreSet.has(value));
    const notesToDelete = Array.from(existingNotes).filter((value) => !nextNoteSet.has(value));
    const genresToInsert = nextGenres.filter((value) => !existingGenres.has(value));
    const notesToInsert = nextNotes.filter((value) => !existingNotes.has(value));

    if (genresToDelete.length > 0) {
      const { error } = await supabase
        .from("book_genres")
        .delete()
        .eq("book_id", bookId)
        .eq("user_id", currentUserId)
        .in("genre", genresToDelete);
      if (error) throw error;
    }

    if (notesToDelete.length > 0) {
      const { error } = await supabase
        .from("book_content_notes")
        .delete()
        .eq("book_id", bookId)
        .eq("user_id", currentUserId)
        .in("content_note", notesToDelete);
      if (error) throw error;
    }

    if (genresToInsert.length > 0) {
      const { error } = await supabase.from("book_genres").insert(
        genresToInsert.map((value) => ({
          book_id: bookId,
          user_id: currentUserId,
          genre: value,
        }))
      );
      if (error) throw error;
    }

    if (notesToInsert.length > 0) {
      const { error } = await supabase.from("book_content_notes").insert(
        notesToInsert.map((value) => ({
          book_id: bookId,
          user_id: currentUserId,
          content_note: value,
        }))
      );
      if (error) throw error;
    }

    await loadCommunityContributions(bookId, currentUserId, row?.books ?? undefined);
  }

  async function saveKanjiWord(vocabId: number) {
    const rows = editingKanjiRows[vocabId] ?? [];
    if (rows.length === 0) return;

    setSavingKanjiWordId(vocabId);

    for (const row of rows) {
      const { error } = await supabase
        .from("vocabulary_kanji_map")
        .update({
          reading_type: row.reading_type ?? "on",
          base_reading: row.base_reading,
          realized_reading: row.realized_reading,
        })
        .eq("id", row.id);

      if (error) {
        console.error("Error saving kanji map row:", error);
        alert(`Could not save kanji row ${row.kanji}.\n${error.message}`);
        setSavingKanjiWordId(null);
        return;
      }
    }

    if (row?.id) {
      await loadSavedKanjiDefaults(row.id);
      setKanjiMapQueue([]);
    }
    setSavingKanjiWordId(null);
  }

  async function loadReadingSessions(userBookIdValue: string) {
    const { data, error } = await supabase
      .from("user_book_reading_sessions")
      .select("id, user_book_id, read_on, start_page, end_page, minutes_read, is_filler, created_at, session_mode")
      .eq("user_book_id", userBookIdValue)
      .order("read_on", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading reading sessions:", error);
      setReadingSessions([]);
      return;
    }

    setReadingSessions((data as ReadingSession[]) ?? []);
  }

  async function loadCharacters(userBookIdValue: string) {
    const { data, error } = await supabase
      .from("user_book_characters")
      .select("id, user_book_id, name, reading, role, notes, sort_order, created_at, updated_at")
      .eq("user_book_id", userBookIdValue)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading characters:", error);
      setCharacters([]);
      return;
    }

    setCharacters((data as Character[]) ?? []);
  }

  async function saveCharacter(item: Character) {
    if (!row?.id) return;

    const payload = {
      user_book_id: row.id,
      name: item.name.trim(),
      reading: item.reading?.trim() || null,
      role: item.role?.trim() || null,
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
        .select("id, user_book_id, name, reading, role, notes, sort_order, created_at, updated_at")
        .single();

      setSavingCharacterIds((prev) => prev.filter((x) => x !== oldId));

      if (error) {
        console.error("Error creating character:", error);
        alert(`Could not save character.\n${error.message}`);
        return;
      }

      const saved = data as Character;

      setCharacters((prev) => prev.map((x) => (x.id === oldId ? saved : x)));
      markCharacterSaved(saved.id);
      return;
    }

    const { data, error } = await supabase
      .from("user_book_characters")
      .update(payload)
      .eq("id", item.id)
      .select("id, user_book_id, name, reading, role, notes, sort_order, created_at, updated_at")
      .single();

    setSavingCharacterIds((prev) => prev.filter((x) => x !== item.id));

    if (error) {
      console.error("Error updating character:", error);
      alert(`Could not update character.\n${error.message}`);
      return;
    }

    const saved = data as Character;

    setCharacters((prev) => prev.map((x) => (x.id === item.id ? saved : x)));
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

    const { error } = await supabase
      .from("user_book_characters")
      .delete()
      .eq("id", id);

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

  async function loadChapterSummaries(userBookIdValue: string) {
    const { data, error } = await supabase
      .from("user_book_chapter_summaries")
      .select(
        "id, user_book_id, chapter_number, chapter_title, summary, sort_order, created_at, updated_at"
      )
      .eq("user_book_id", userBookIdValue)
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

  async function loadSavedKanjiDefaults(userBookIdValue: string) {
    const KANJI_ENRICHMENT_TEST_START = "2026-04-20T00:00:00";

    const { data: bookWordRows, error: bookWordErr } = await supabase
      .from("user_book_words")
      .select(
        "id, user_book_id, vocabulary_cache_id, surface, reading, is_manual_override, created_at"
      )
      .eq("user_book_id", userBookIdValue)
      .or("target_language_code.is.null,target_language_code.eq.ja")
      .eq("is_manual_override", false)
      .eq("ignore_kanji_enrichment", false)
      .gte("created_at", KANJI_ENRICHMENT_TEST_START);

    if (bookWordErr) {
      console.error("Error loading book vocabulary cache ids:", bookWordErr);
      setSavedKanjiDefaults({});
      return;
    }

    const kanjiBookWordRows = (bookWordRows ?? []).filter((r: any) =>
      /[\p{Script=Han}]/u.test(r.surface ?? "")
    );

    const cacheIds = Array.from(
      new Set(
        kanjiBookWordRows
          .map((r: any) => r.vocabulary_cache_id)
          .filter((id: number | null) => id != null)
      )
    );

    if (cacheIds.length === 0) {
      setSavedKanjiDefaults({});
      return;
    }

    const { data, error } = await supabase
      .from("vocabulary_kanji_map")
      .select("kanji, reading_type, base_reading, realized_reading")
      .in("vocabulary_cache_id", cacheIds);

    if (error) {
      console.error("Error loading saved kanji defaults:", error);
      setSavedKanjiDefaults({});
      return;
    }

    const rows = (data ?? []) as Array<{
      kanji: string;
      reading_type: "on" | "kun" | "other" | null;
      base_reading: string | null;
      realized_reading: string | null;
    }>;

    const byKanji: Record<string, SessionKanjiReading> = {};

    for (const row of rows) {
      if (!row.kanji) continue;

      const nextValue: SessionKanjiReading = {
        reading_type:
          row.reading_type ??
          (row.base_reading?.trim() && row.realized_reading?.trim() ? "on" : null),
        base: row.base_reading,
        realized: row.realized_reading,
      };

      const hasUsefulReading =
        !!nextValue.base?.trim() || !!nextValue.realized?.trim();

      if (!hasUsefulReading) continue;

      const existing = byKanji[row.kanji];

      if (!existing) {
        byKanji[row.kanji] = nextValue;
        continue;
      }

      if (existing.reading_type === "on") continue;

      if (row.reading_type === "on") {
        byKanji[row.kanji] = nextValue;
      }
    }

    setSavedKanjiDefaults(byKanji);
  }

  function buildPreparedKanjiRows(rows: KanjiMapRow[]) {
    return rows.map((r) => {
      const sessionMemory = kanjiReadingMemoryRef.current[r.kanji];
      const savedDefault = savedKanjiDefaults[r.kanji];
      const readingType =
        r.reading_type ??
        (r.base_reading?.trim() && r.realized_reading?.trim() ? "on" : null);

      const rememberedForType =
        readingType && sessionMemory
          ? sessionMemory[readingType]
          : null;

      if (rememberedForType) {
        return {
          ...r,
          reading_type: readingType,
          base_reading: r.base_reading || rememberedForType.base,
          realized_reading: r.realized_reading || rememberedForType.realized,
        };
      }

      if (savedDefault) {
        return {
          ...r,
          reading_type: r.reading_type || savedDefault.reading_type,
          base_reading: r.base_reading || savedDefault.base,
          realized_reading: r.realized_reading || savedDefault.realized,
        };
      }

      return r;
    });
  }

  async function loadKanjiMapQueue(userBookIdValue: string) {
    const currentUserBookId = userBookIdValue;

    setKanjiMapLoading(true);
    setKanjiMapError(null);

    const KANJI_ENRICHMENT_TEST_START = "2026-04-20T00:00:00";

    const LEGACY_KANJI_BOOK_IDS = [
      "e4934e68-b374-4c11-8702-8efafcecc0e7",
    ];

    let bookWordQuery = supabase
      .from("user_book_words")
      .select(
        "id, surface, reading, vocabulary_cache_id, is_manual_override, created_at, ignore_kanji_enrichment"
      )
      .eq("is_manual_override", false)
      .eq("ignore_kanji_enrichment", false)
      .or("target_language_code.is.null,target_language_code.eq.ja")
      .eq("user_book_id", userBookIdValue);

    if (!LEGACY_KANJI_BOOK_IDS.includes(userBookIdValue)) {
      bookWordQuery = bookWordQuery.gte("created_at", KANJI_ENRICHMENT_TEST_START);
    }

    const { data: bookWordRows, error: bookWordErr } = await bookWordQuery;

    if (bookWordErr) {
      console.error("Error loading book vocabulary cache ids:", bookWordErr);
      setKanjiMapQueue([]);
      setNeedsKanjiEnrichmentCount(0);
      setKanjiMapError(bookWordErr.message);
      setKanjiMapLoading(false);
      return;
    }

    const kanjiBookWordRows = (bookWordRows ?? []).filter((r: any) =>
      /[\p{Script=Han}]/u.test(r.surface ?? "")
    );

    const missingCacheCount = kanjiBookWordRows.filter(
      (r: any) => r.vocabulary_cache_id == null
    ).length;

    let repairedExactCacheLinks = false;

    for (const bookWord of kanjiBookWordRows as any[]) {
      const savedSurface = String(bookWord.surface ?? "").trim();
      const savedReading = String(bookWord.reading ?? "").trim();

      if (!savedSurface || bookWord.vocabulary_cache_id == null) continue;

      const { data: currentCache, error: currentCacheError } = await supabase
        .from("vocabulary_cache")
        .select("id, surface, reading")
        .eq("id", bookWord.vocabulary_cache_id)
        .maybeSingle();

      if (currentCacheError) {
        console.error("Error checking current vocabulary cache row:", currentCacheError);
        continue;
      }

      const cacheSurface = String(currentCache?.surface ?? "").trim();
      const cacheReading = String(currentCache?.reading ?? "").trim();

      if (cacheSurface === savedSurface && cacheReading === savedReading) continue;

      const { data: exactCache, error: exactCacheError } = await supabase
        .from("vocabulary_cache")
        .select("id")
        .eq("surface", savedSurface)
        .eq("reading", savedReading)
        .maybeSingle();

      if (exactCacheError) {
        console.error("Error looking up exact vocabulary cache row:", exactCacheError);
        continue;
      }

      let exactCacheId = exactCache?.id ?? null;

      if (!exactCacheId) {
        const { data: createdCache, error: createCacheError } = await supabase
          .from("vocabulary_cache")
          .insert({
            surface: savedSurface,
            reading: savedReading,
          })
          .select("id")
          .single();

        if (createCacheError || !createdCache) {
          console.error("Error creating exact vocabulary cache row:", createCacheError);
          continue;
        }

        exactCacheId = createdCache.id;
      }

      if (exactCacheId && exactCacheId !== bookWord.vocabulary_cache_id) {
        const { error: relinkError } = await supabase
          .from("user_book_words")
          .update({
            vocabulary_cache_id: exactCacheId,
            is_manual_override: false,
            ignore_kanji_enrichment: false,
          })
          .eq("id", bookWord.id);

        if (relinkError) {
          console.error("Error relinking saved word to exact cache row:", relinkError);
          continue;
        }

        bookWord.vocabulary_cache_id = exactCacheId;
        repairedExactCacheLinks = true;
      }
    }

    if (repairedExactCacheLinks) {
      console.info("Repaired exact vocabulary cache links for kanji enrichment queue.");
    }

    const cacheIds = Array.from(
      new Set(
        kanjiBookWordRows
          .map((r: any) => r.vocabulary_cache_id)
          .filter((id: number | null) => id != null)
      )
    );

    if (cacheIds.length === 0) {
      const missingCacheWords: VocabCacheQueueRow[] = kanjiBookWordRows
        .filter((r: any) => r.vocabulary_cache_id == null)
        .map((r: any, index: number) => ({
          id: -(index + 1),
          userBookWordId: String(r.id),
          vocabularyCacheId: null,
          surface: r.surface ?? "",
          reading: r.reading ?? "",
          jlpt: null,
          created_at: "",
          enrichmentStatus: "missing",
          vocabulary_kanji_map: [],
        }));

      setKanjiMapQueue(missingCacheWords);
      setNeedsKanjiEnrichmentCount(missingCacheWords.length);
      setKanjiMapLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("vocabulary_cache")
      .select(`
      id,
      surface,
      reading,
      jlpt,
      created_at,
      vocabulary_kanji_map (
        id,
        vocabulary_cache_id,
        kanji,
        kanji_position,
        reading_type,
        base_reading,
        realized_reading
      )
    `)
      .in("id", cacheIds)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading kanji map queue:", error);
      setKanjiMapQueue([]);
      setNeedsKanjiEnrichmentCount(0);
      setKanjiMapError(error.message);
      setKanjiMapLoading(false);
      return;
    }

    let cacheRows: VocabCacheQueueRow[] = (data ?? []).map((item: any) => ({
      id: item.id,
      userBookWordId: "",
      vocabularyCacheId: item.id,
      surface: item.surface ?? "",
      reading: item.reading ?? "",
      jlpt: item.jlpt ?? null,
      created_at: item.created_at ?? "",
      enrichmentStatus: "partial",
      vocabulary_kanji_map: item.vocabulary_kanji_map ?? [],
    }));

    const readyByExactWord = new Map<string, VocabCacheQueueRow>();

    function isFullyEnrichedWord(word: VocabCacheQueueRow) {
      const mapRows = word.vocabulary_kanji_map ?? [];
      const kanjiCount = Array.from(word.surface ?? "").filter((ch) =>
        /\p{Script=Han}/u.test(ch)
      ).length;

      if (kanjiCount === 0) return false;
      if (mapRows.length !== kanjiCount) return false;

      return mapRows.every((row) => {
        const readingType =
          row.reading_type ??
          (row.base_reading?.trim() && row.realized_reading?.trim() ? "on" : null);

        return !!readingType && !!row.base_reading && !!row.realized_reading;
      });
    }

    for (const word of cacheRows) {
      if (!isFullyEnrichedWord(word)) continue;
      readyByExactWord.set(normalizeKanjiQueueKey(word.surface, word.reading), word);
    }

    let autoFilledAny = false;

    for (const word of cacheRows) {
      const exactKey = normalizeKanjiQueueKey(word.surface, word.reading);
      const donor = readyByExactWord.get(exactKey);

      if (!donor || donor.id === word.id) continue;

      const currentRows = word.vocabulary_kanji_map ?? [];
      const currentByPosition = new Map<number, KanjiMapRow>();
      for (const row of currentRows) {
        currentByPosition.set(row.kanji_position, row);
      }

      const updates: Array<() => Promise<{ error: any }>> = [];
      const inserts: Array<{
        vocabulary_cache_id: number;
        kanji: string;
        kanji_position: number;
        reading_type: "on" | "kun" | "other" | null;
        base_reading: string | null;
        realized_reading: string | null;
      }> = [];

      for (const donorRow of donor.vocabulary_kanji_map ?? []) {
        const existing = currentByPosition.get(donorRow.kanji_position);

        if (existing) {
          const needsUpdate =
            existing.kanji !== donorRow.kanji ||
            existing.reading_type !== donorRow.reading_type ||
            existing.base_reading !== donorRow.base_reading ||
            existing.realized_reading !== donorRow.realized_reading;

          if (needsUpdate) {
            updates.push(
              async () =>
                await supabase
                  .from("vocabulary_kanji_map")
                  .update({
                    kanji: donorRow.kanji,
                    reading_type: donorRow.reading_type,
                    base_reading: donorRow.base_reading,
                    realized_reading: donorRow.realized_reading,
                  })
                  .eq("id", existing.id)
            );
          }
        } else {
          inserts.push({
            vocabulary_cache_id: word.id,
            kanji: donorRow.kanji,
            kanji_position: donorRow.kanji_position,
            reading_type: donorRow.reading_type,
            base_reading: donorRow.base_reading,
            realized_reading: donorRow.realized_reading,
          });
        }
      }

      if (updates.length > 0) {
        const results = await Promise.all(updates.map((runUpdate) => runUpdate()));
        const failed = results.find((result) => result.error);
        if (failed?.error) {
          console.error("Error auto-filling exact-word kanji map rows:", failed.error);
        } else {
          autoFilledAny = true;
        }
      }

      if (inserts.length > 0) {
        const { error: insertError } = await supabase
          .from("vocabulary_kanji_map")
          .insert(inserts);

        if (insertError) {
          console.error("Error inserting exact-word kanji map rows:", insertError);
        } else {
          autoFilledAny = true;
        }
      }
    }

    if (autoFilledAny) {
      const { data: refreshedData, error: refreshedError } = await supabase
        .from("vocabulary_cache")
        .select(`
      id,
      surface,
      reading,
      jlpt,
      created_at,
      vocabulary_kanji_map (
        id,
        vocabulary_cache_id,
        kanji,
        kanji_position,
        reading_type,
        base_reading,
        realized_reading
      )
    `)
        .in("id", cacheIds)
        .order("created_at", { ascending: true });

      if (refreshedError) {
        console.error("Error refreshing kanji map queue after exact-word auto-fill:", refreshedError);
      } else {
        cacheRows = (refreshedData ?? []).map((item: any) => ({
          id: item.id,
          userBookWordId: "",
          vocabularyCacheId: item.id,
          surface: item.surface ?? "",
          reading: item.reading ?? "",
          jlpt: item.jlpt ?? null,
          created_at: item.created_at ?? "",
          enrichmentStatus: "partial",
          vocabulary_kanji_map: item.vocabulary_kanji_map ?? [],
        }));
      }
    }

    const missingCacheWords: VocabCacheQueueRow[] = kanjiBookWordRows
      .filter((r: any) => r.vocabulary_cache_id == null)
      .map((r: any, index: number) => ({
        id: -(index + 1),
        userBookWordId: String(r.id),
        vocabularyCacheId: null,
        surface: r.surface ?? "",
        reading: r.reading ?? "",
        jlpt: null,
        created_at: "",
        enrichmentStatus: "missing",
        vocabulary_kanji_map: [],
      }));

    const needsWork = cacheRows.flatMap((word) => {
      const mapRows = word.vocabulary_kanji_map ?? [];

      const completePositions = new Set(
        mapRows
          .filter(
            (r) =>
              typeof r.kanji_position === "number" &&
              !!(
                r.reading_type ??
                (r.base_reading?.trim() && r.realized_reading?.trim() ? "on" : null)
              ) &&
              !!r.base_reading &&
              !!r.realized_reading
          )
          .map((r) => r.kanji_position)
      );

      const matchingBookWords = kanjiBookWordRows.filter(
        (r: any) => r.vocabulary_cache_id === word.id
      );

      return matchingBookWords.flatMap((bookWord: any) => {
        const savedSurface = String(bookWord.surface ?? word.surface ?? "");
        const savedReading = String(bookWord.reading ?? word.reading ?? "");

        const kanjiCount = Array.from(savedSurface).filter((ch) =>
          /\p{Script=Han}/u.test(ch)
        ).length;

        if (kanjiCount === 0) return [];

        const needsWorkForThisWord = completePositions.size < kanjiCount;

        if (!needsWorkForThisWord) return [];

        const enrichmentStatus: VocabCacheQueueRow["enrichmentStatus"] =
          mapRows.length === 0 ? "missing" : "partial";

        return [
          {
            ...word,
            userBookWordId: String(bookWord.id),
            vocabularyCacheId: word.id,
            surface: savedSurface,
            reading: savedReading,
            enrichmentStatus,
          },
        ];
      });
    });

    const combinedQueue = [...missingCacheWords, ...needsWork];
    const nextEditingRows: Record<number, KanjiMapRow[]> = {};
    const nextOpenKanjiWordIds: Record<number, boolean> = {};

    for (const word of combinedQueue) {
      const mapRows = word.vocabulary_kanji_map ?? [];

      if (mapRows.length > 0) {
        nextEditingRows[word.id] = buildPreparedKanjiRows(mapRows);
        nextOpenKanjiWordIds[word.id] = true;
      }
    }

    setEditingKanjiRows(nextEditingRows);
    setOpenKanjiWordIds(nextOpenKanjiWordIds);
    setKanjiMapQueue(combinedQueue);
    setNeedsKanjiEnrichmentCount(combinedQueue.length);
    setKanjiMapLoading(false);
  }

  async function deleteReadingSession(sessionId: string) {
    const ok = window.confirm("Delete this reading session?");
    if (!ok) return;

    const { error } = await supabase
      .from("user_book_reading_sessions")
      .delete()
      .eq("id", sessionId);

    if (error) {
      console.error("Error deleting reading session:", error);
      alert(`Could not delete reading session.\n${error.message || "Unknown error"}`);
      return;
    }

    if (row?.id) {
      await loadReadingSessions(row.id);
    }
  }

  async function fillBeginningPages() {
    if (!row?.id || earliestTrackedStartPage == null || earliestTrackedStartPage <= 1) return;

    const { error } = await supabase
      .from("user_book_reading_sessions")
      .insert({
        user_book_id: row.id,
        read_on: startedAt || todayYmdAppTimeZone(),
        start_page: 1,
        end_page: earliestTrackedStartPage - 1,
        minutes_read: null,
        is_filler: true,
        session_mode: "fluid",
      });

    if (error) {
      console.error("Error filling beginning pages:", error);
      alert("Could not fill the empty beginning pages.");
      return;
    }

    await loadReadingSessions(row.id);
  }

  async function fillEndingPages() {
    if (!row?.id || !book?.page_count || furthestTrackedPage == null || furthestTrackedPage >= book.page_count) return;

    const { error } = await supabase
      .from("user_book_reading_sessions")
      .insert({
        user_book_id: row.id,
        read_on: finishedAt || todayYmdAppTimeZone(),
        start_page: furthestTrackedPage + 1,
        end_page: book.page_count,
        minutes_read: null,
        is_filler: true,
        session_mode: "fluid",
      });

    if (error) {
      console.error("Error filling ending pages:", error);
      alert("Could not fill the empty ending pages.");
      return;
    }

    await loadReadingSessions(row.id);
  }

  const renderSessionToggle = () => {

    return (
      <button
        type="button"
        onClick={() => setShowAllSessions((prev) => !prev)}
        className="text-sm font-medium text-stone-600 underline underline-offset-4 hover:text-stone-900"
      >
        {showAllSessions ? "Show less" : `View all (${readingSessions.length})`}
      </button>
    );
  };

  async function saveChapterSummary(item: ChapterSummary) {
    if (!row?.id) return;
    const currentUserBookId = row.id;

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
        .select(
          "id, user_book_id, chapter_number, chapter_title, summary, sort_order, created_at, updated_at"
        )
        .single();

      setSavingChapterIds((prev) => prev.filter((x) => x !== oldId));

      if (error) {
        console.error("Error creating chapter summary:", error);
        alert("Could not save chapter summary.");
        return;
      }

      const saved = data as ChapterSummary;

      setChapterSummaries((prev) => prev.map((x) => (x.id === oldId ? saved : x)));
      setEditingChapterIds((prev) =>
        prev.map((x) => (x === oldId ? saved.id : x))
      );

      stopEditingChapter(saved.id);
      markChapterSaved(saved.id);
      return;
    }

    const { data, error } = await supabase
      .from("user_book_chapter_summaries")
      .update(payload)
      .eq("id", item.id)
      .select(
        "id, user_book_id, chapter_number, chapter_title, summary, sort_order, created_at, updated_at"
      )
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

  async function handleWorkOnKanjiWord(word: VocabCacheQueueRow) {
    if (!row?.id) return;
    const currentUserBookId = row.id;

    let workingWord = word;

    if (word.id < 0) {
      let cacheRow: {
        id: number;
        surface: string | null;
        reading: string | null;
        jlpt: string | null;
        created_at: string | null;
      } | null = null;

      const { data: existingCache, error: cacheLookupError } = await supabase
        .from("vocabulary_cache")
        .select("id, surface, reading, jlpt, created_at")
        .eq("surface", word.surface)
        .eq("reading", word.reading || "")
        .maybeSingle();

      if (cacheLookupError) {
        console.error("Error looking up vocabulary cache row:", cacheLookupError);
        alert("Could not prepare this word.");
        return;
      }

      if (existingCache) {
        cacheRow = existingCache;
      } else {
        const { data: createdCache, error: cacheInsertError } = await supabase
          .from("vocabulary_cache")
          .insert({
            surface: word.surface,
            reading: word.reading || "",
          })
          .select("id, surface, reading, jlpt, created_at")
          .single();

        if (cacheInsertError || !createdCache) {
          console.error("Error creating vocabulary cache row:", cacheInsertError);
          alert("Could not prepare this word.");
          return;
        }

        cacheRow = createdCache;
      }

      const { error: updateWordError } = await supabase
        .from("user_book_words")
        .update({
          vocabulary_cache_id: cacheRow.id,
          is_manual_override: false,
        })
        .eq("id", word.userBookWordId);

      if (updateWordError) {
        console.error("Error linking user_book_words to cache row:", updateWordError);
        alert("Could not link this word to kanji enrichment.");
        return;
      }

      workingWord = {
        id: cacheRow.id,
        userBookWordId: word.userBookWordId,
        vocabularyCacheId: cacheRow.id,
        surface: cacheRow.surface ?? word.surface,
        reading: cacheRow.reading ?? word.reading,
        jlpt: cacheRow.jlpt ?? null,
        created_at: cacheRow.created_at ?? "",
        enrichmentStatus: "missing",
        vocabulary_kanji_map: [],
      };
    }

    let desiredSurface = String(workingWord.surface ?? "").trim();
    let desiredReading = String(workingWord.reading ?? "").trim();

    // Use the actual saved book word as the source of truth.
    // This matters when the saved word surface differs from the cache surface,
    // e.g. saved word 出所 / cache word 出どころ.
    if (workingWord.userBookWordId) {
      const { data: savedWord, error: savedWordError } = await supabase
        .from("user_book_words")
        .select("surface, reading")
        .eq("id", workingWord.userBookWordId)
        .maybeSingle();

      if (savedWordError) {
        console.error("Error loading saved word for exact kanji enrichment:", savedWordError);
        alert("Could not prepare this word.");
        return;
      }

      if (savedWord?.surface) {
        desiredSurface = String(savedWord.surface).trim();
      }

      if (savedWord?.reading) {
        desiredReading = String(savedWord.reading).trim();
      }

      workingWord = {
        ...workingWord,
        surface: desiredSurface,
        reading: desiredReading,
      };
    }

    let currentVocabularyCacheId =
      workingWord.vocabularyCacheId ?? (workingWord.id > 0 ? workingWord.id : null);

    if (!currentVocabularyCacheId) {
      alert("Could not prepare this word because no vocabulary cache id was found.");
      return;
    }

    // If the saved book word uses a different surface than the current cache row
    // For example: saved word 出所 / cache word 出どころ
    // create or reuse an exact cache row for the saved surface.
    if (desiredSurface) {
      const { data: exactCache, error: exactCacheLookupError } = await supabase
        .from("vocabulary_cache")
        .select("id, surface, reading, jlpt, created_at")
        .eq("surface", desiredSurface)
        .eq("reading", desiredReading)
        .maybeSingle();

      if (exactCacheLookupError) {
        console.error("Error looking up exact vocabulary cache row:", exactCacheLookupError);
        alert("Could not prepare this word.");
        return;
      }

      let exactCacheRow = exactCache;

      if (!exactCacheRow) {
        const { data: createdCache, error: createExactCacheError } = await supabase
          .from("vocabulary_cache")
          .insert({
            surface: desiredSurface,
            reading: desiredReading,
          })
          .select("id, surface, reading, jlpt, created_at")
          .single();

        if (createExactCacheError || !createdCache) {
          console.error("Error creating exact vocabulary cache row:", createExactCacheError);
          alert("Could not prepare this word.");
          return;
        }

        exactCacheRow = createdCache;
      }

      if (exactCacheRow.id !== currentVocabularyCacheId) {
        const { error: relinkError } = await supabase
          .from("user_book_words")
          .update({
            vocabulary_cache_id: exactCacheRow.id,
            is_manual_override: false,
            ignore_kanji_enrichment: false,
          })
          .eq("id", workingWord.userBookWordId);

        if (relinkError) {
          console.error("Error relinking saved word to exact cache row:", relinkError);
          alert("Could not link this word to its exact kanji enrichment row.");
          return;
        }

        currentVocabularyCacheId = exactCacheRow.id;

        workingWord = {
          ...workingWord,
          id: exactCacheRow.id,
          vocabularyCacheId: exactCacheRow.id,
          surface: exactCacheRow.surface ?? desiredSurface,
          reading: exactCacheRow.reading ?? desiredReading,
          jlpt: exactCacheRow.jlpt ?? null,
          created_at: exactCacheRow.created_at ?? "",
          vocabulary_kanji_map: [],
        };
      }
    }

    // Always make sure there is one map row for every kanji in the saved surface.
    // Do not only do this when there are zero rows, because mixed cache/saved surfaces
    // can leave us with one row when we actually need two.
    const kanjiChars = Array.from(workingWord.surface ?? "").filter((ch) =>
      /\p{Script=Han}/u.test(ch)
    );

    const rowsToInsert = kanjiChars.map((kanji, index) => ({
      vocabulary_cache_id: currentVocabularyCacheId,
      kanji,
      kanji_position: index,
    }));

    if (rowsToInsert.length > 0) {
      const { data: existingRows, error: existingRowsError } = await supabase
        .from("vocabulary_kanji_map")
        .select("kanji_position")
        .eq("vocabulary_cache_id", currentVocabularyCacheId);

      if (existingRowsError) {
        console.error("Error checking existing kanji map rows:", existingRowsError);
        alert("Could not prepare this word.");
        return;
      }

      const existingPositions = new Set(
        (existingRows ?? []).map((item: any) => Number(item.kanji_position))
      );

      const missingRows = rowsToInsert.filter(
        (item) => !existingPositions.has(item.kanji_position)
      );

      if (missingRows.length > 0) {
        const { error: insertError } = await supabase
          .from("vocabulary_kanji_map")
          .insert(missingRows);

        if (insertError) {
          console.error("Error inserting kanji map rows:", insertError);
          alert(insertError.message || "Could not prepare this word.");
          return;
        }
      }
    }

    workingWord = {
      ...workingWord,
      vocabularyCacheId: currentVocabularyCacheId,
      vocabulary_kanji_map: [],
    };

    const { data, error } = await supabase
      .from("vocabulary_kanji_map")
      .select(`
      id,
      vocabulary_cache_id,
      kanji,
      kanji_position,
      reading_type,
      base_reading,
      realized_reading
    `)
      .eq("vocabulary_cache_id", workingWord.id)
      .order("kanji_position", { ascending: true });

    if (error) {
      console.error("Error loading kanji rows:", error);
      alert("Could not load kanji rows.");
      return;
    }

    const rows = (data ?? []) as KanjiMapRow[];

    const enrichedRows = buildPreparedKanjiRows(rows);

    setEditingKanjiRows((prev) => ({
      ...prev,
      [workingWord.id]: enrichedRows,
    }));

    upsertKanjiQueueWord({
      ...workingWord,
      vocabularyCacheId:
        workingWord.vocabularyCacheId ?? (workingWord.id > 0 ? workingWord.id : null),
      vocabulary_kanji_map: rows,
      enrichmentStatus: rows.some((r) => {
        const readingType =
          r.reading_type ??
          (r.base_reading?.trim() && r.realized_reading?.trim() ? "on" : null);

        return !readingType || !r.base_reading || !r.realized_reading;
      })
        ? "partial"
        : "ready",
    });

    setOpenKanjiWordIds((prev) => ({
      ...prev,
      [workingWord.id]: true,
    }));
    setTimeout(() => {
      const el = document.getElementById(`kanji-word-${workingWord.id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  async function removeWordFromKanjiEnrichment(vocabId: number) {
    if (!row?.id) return;
    const currentUserBookId = row.id;

    if (!row?.id) return;

    const ok = window.confirm(
      "Remove this word from this book's kanji enrichment area?"
    );
    if (!ok) return;

    const { error } = await supabase
      .from("user_book_words")
      .update({
        ignore_kanji_enrichment: true,
        kanji_enrichment_ignore_reason: "Removed from teacher enrichment queue",
        kanji_enrichment_ignored_at: new Date().toISOString(),
        kanji_enrichment_ignored_by: userId,
      })
      .eq("user_book_id", currentUserBookId)
      .or("target_language_code.is.null,target_language_code.eq.ja")
      .eq("vocabulary_cache_id", vocabId);

    if (error) {
      console.error("Error removing word from kanji enrichment:", error);
      alert(`Could not remove word.\n${error.message}`);
      return;
    }

    await loadSavedKanjiDefaults(row.id);
    setKanjiMapQueue([]);
  }

  function updateKanjiMapRow(
    vocabId: number,
    rowId: number,
    field: keyof Pick<KanjiMapRow, "reading_type" | "base_reading" | "realized_reading">,
    value: string
  ) {
    setEditingKanjiRows((prev) => ({
      ...prev,
      [vocabId]: (prev[vocabId] ?? []).map((row) => {
        if (row.id !== rowId) return row;

        const nextValue = value === "" ? null : value;
        const kanjiMemory = kanjiReadingMemoryRef.current[row.kanji] ?? {};

        let updatedRow: KanjiMapRow = row;

        if (field === "reading_type") {
          const nextType = nextValue as "on" | "kun" | "other" | null;
          const remembered =
            nextType && kanjiMemory[nextType]
              ? kanjiMemory[nextType]
              : null;

          updatedRow = {
            ...row,
            reading_type: nextType,
            base_reading: remembered?.base ?? null,
            realized_reading: remembered?.realized ?? null,
          };
        } else if (field === "base_reading") {
          const prevBase = row.base_reading ?? "";
          const prevRealized = row.realized_reading ?? "";

          const shouldSyncRealized =
            prevRealized.trim() === "" || prevRealized === prevBase;

          updatedRow = {
            ...row,
            base_reading: nextValue,
            realized_reading: shouldSyncRealized ? nextValue : row.realized_reading,
          };
        } else {
          updatedRow = {
            ...row,
            realized_reading: nextValue,
          };
        }

        const type = updatedRow.reading_type;
        if (type) {
          kanjiReadingMemoryRef.current[row.kanji] = {
            ...(kanjiReadingMemoryRef.current[row.kanji] ?? {}),
            [type]: {
              base: updatedRow.base_reading,
              realized: updatedRow.realized_reading,
            },
          };
        }

        return updatedRow;
      }),
    }));
  }

  function setKanjiWordOpen(vocabId: number, isOpen: boolean) {
    setOpenKanjiWordIds((prev) => {
      if (isOpen) {
        return {
          ...prev,
          [vocabId]: true,
        };
      }

      const next = { ...prev };
      delete next[vocabId];
      return next;
    });
  }

  function upsertKanjiQueueWord(nextWord: VocabCacheQueueRow) {
    setKanjiMapQueue((prev) => {
      const next = [...prev];
      const existingIndex = next.findIndex(
        (item) =>
          item.userBookWordId === nextWord.userBookWordId ||
          item.id === nextWord.id
      );

      if (existingIndex >= 0) {
        next[existingIndex] = nextWord;
        return next;
      }

      return [nextWord, ...next];
    });
  }

  async function saveBookStatusDates(
    nextStartedAt: string,
    nextFinishedAt: string,
    nextDnfAt: string
  ) {
    if (!row?.id) return;

    const started_at = nextStartedAt.trim() ? nextStartedAt.trim() : null;
    const finished_at = nextFinishedAt.trim() ? nextFinishedAt.trim() : null;
    const dnf_at = nextDnfAt.trim() ? nextDnfAt.trim() : null;
    const nextDnfReason = dnf_at && dnfReason.trim() ? dnfReason.trim() : null;
    const nextDnfNote = dnf_at && dnfNote.trim() ? dnfNote.trim() : null;
    const nextWouldRetry = dnf_at && wouldRetry.trim() ? wouldRetry.trim() : null;

    const status =
      dnf_at ? "did_not_finish" :
        finished_at ? "finished" :
          started_at ? "reading" :
            "what_to_read";

    const { error } = await supabase
      .from("user_books")
      .update({
        status,
        started_at,
        finished_at,
        dnf_at,
        dnf_reason: nextDnfReason,
        dnf_note: nextDnfNote,
        would_retry: nextWouldRetry,
      })
      .eq("id", row.id);

    if (error) {
      console.error("Error saving dashboard book status:", error);
      alert(`Could not save book status.\n${error.message || "Unknown error"}`);
      return;
    }

    setStartedAt(started_at ?? "");
    setFinishedAt(finished_at ?? "");
    setDnfAt(dnf_at ?? "");
    setDnfReason(nextDnfReason ?? "");
    setDnfNote(nextDnfNote ?? "");
    setWouldRetry(nextWouldRetry ?? "");

    setRow((prev) =>
      prev
        ? {
          ...prev,
          started_at,
          finished_at,
          dnf_at,
          dnf_reason: nextDnfReason,
          dnf_note: nextDnfNote,
          would_retry: nextWouldRetry,
        }
        : prev
    );
  }

  async function markStartedToday() {
    const today = todayYmdAppTimeZone();
    await saveBookStatusDates(today, "", "");
  }

  function openReadingReflection() {
    setActiveTab("reflection");
    window.requestAnimationFrame(() => {
      document
        .getElementById("reader-difficulty-section")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function markFinishedToday() {
    const today = todayYmdAppTimeZone();
    const nextStartedAt = startedAt || today;
    await saveBookStatusDates(nextStartedAt, today, "");
    setSaveNoticeTone("success");
    setSaveNotice(null);
    openReadingReflection();
  }

  async function markDnfToday() {
    const today = todayYmdAppTimeZone();
    const nextStartedAt = startedAt || today;
    await saveBookStatusDates(nextStartedAt, "", today);
  }

  async function saveReadingSession() {
    if (!row?.id) return;

    const usingPercentMode = progressMode === "percent";
    const usingListeningPercentMode =
      sessionMode === "listening" &&
      book?.page_count != null &&
      book.page_count > 0;
    const endInputIsPercent =
      sessionMode === "listening" ? usingListeningPercentMode : usingPercentMode;
    const parsedStart =
      sessionMode === "listening" || sessionStartPage.trim() === ""
        ? null
        : Number(sessionStartPage);
    const parsedEnd =
      sessionEndPage.trim() === "" ? null : Number(sessionEndPage);

    const start =
      usingPercentMode && sessionMode !== "listening"
        ? percentToPage(parsedStart, book?.page_count ?? null)
        : parsedStart;

    const end =
      endInputIsPercent
        ? percentToPage(parsedEnd, book?.page_count ?? null)
        : parsedEnd;

    const minutesFromInput =
      sessionMinutesRead.trim() === "" ? null : Number(sessionMinutesRead);

    const minutes =
      showTimedSessionForm
        ? Math.max(1, Math.round(elapsed / 60))
        : minutesFromInput;

    if (!sessionDate) {
      alert("Please fill in the date.");
      return;
    }

    if (sessionMode !== "listening") {
      if (usingPercentMode && (!book?.page_count || book.page_count <= 0)) {
        alert("Percent progress needs a page count for this book.");
        return;
      }

      if (
        (usingPercentMode &&
          (!Number.isFinite(parsedStart) || !Number.isFinite(parsedEnd))) ||
        (!usingPercentMode &&
          (!Number.isFinite(start) || !Number.isFinite(end)))
      ) {
        alert(
          usingPercentMode
            ? "Please fill in date, start percent, and end percent."
            : "Please fill in date, start page, and end page."
        );
        return;
      }

      if (usingPercentMode) {
        if ((parsedStart as number) < 0 || (parsedEnd as number) < 0) {
          alert("Percents must be 0 or higher.");
          return;
        }

        if ((parsedStart as number) > 100 || (parsedEnd as number) > 100) {
          alert("Percents must be 100 or lower.");
          return;
        }
      } else {
        if ((start as number) <= 0 || (end as number) <= 0) {
          alert("Pages must be greater than 0.");
          return;
        }
      }

      if ((end as number) < (start as number)) {
        alert(
          usingPercentMode
            ? "End percent must be greater than or equal to start percent."
            : "End page must be greater than or equal to start page."
        );
        return;
      }
    } else {
      if (
        endInputIsPercent &&
        parsedEnd !== null &&
        (!Number.isFinite(parsedEnd) || parsedEnd < 0 || parsedEnd > 100)
      ) {
        alert("Listening end percent must be between 0 and 100 if provided.");
        return;
      }

      if (!endInputIsPercent && end !== null && (!Number.isFinite(end) || end <= 0)) {
        alert("Listening end page must be greater than 0 if provided.");
        return;
      }
    }

    if (minutes !== null && (!Number.isFinite(minutes) || minutes <= 0)) {
      alert("Minutes must be greater than 0 if provided.");
      return;
    }

    const payload = {
      user_book_id: row.id,
      read_on: sessionDate,
      start_page: sessionMode === "listening" ? null : start,
      end_page: end,
      minutes_read: minutes,
      session_mode: sessionMode,
    };

    if (editingReadingSessionId) {
      const { error } = await supabase
        .from("user_book_reading_sessions")
        .update(payload)
        .eq("id", editingReadingSessionId)
        .eq("user_book_id", row.id);

      if (error) {
        console.error("Error updating reading session:", error);
        alert(`Could not update reading session.\n${error.message || "Unknown error"}`);
        return;
      }
    } else {
      const { error } = await supabase
        .from("user_book_reading_sessions")
        .insert(payload);

      if (error) {
        console.error("Error saving reading session:", error);
        alert(`Could not save reading session.\n${error.message || "Unknown error"}`);
        return;
      }
    }

    const existingStartedAt = row.started_at ? row.started_at.slice(0, 10) : null;

    // Logging a reading session should only backfill the book's start date
    // when no start date has been set yet. It should never overwrite an
    // existing start date or clear finish/DNF dates.
    if (!existingStartedAt) {
      const { error: startErr } = await supabase
        .from("user_books")
        .update({
          status: "reading",
          started_at: sessionDate,
        })
        .eq("id", row.id);

      if (startErr) {
        console.error("Error updating user_books from reading session:", startErr);
      } else {
        setStartedAt(sessionDate);
        setRow((prev) =>
          prev
            ? {
              ...prev,
              started_at: sessionDate,
            }
            : prev
        );
      }
    }

    await loadReadingSessions(row.id);

    setTimerSaveMessage(
      editingReadingSessionId
        ? "Your session has been updated."
        : "Your session has been saved in the Reading Tab."
    );
    setTimeout(() => setTimerSaveMessage(""), 4000);

    setEditingReadingSessionId(null);
    setSessionStartPage("");
    setSessionEndPage("");
    setSessionMinutesRead("");
    setShowTimedSessionForm(false);
    setElapsed(0);
    setStartTime(null);
    setSessionMode("curiosity");
  }

  const loadUniqueLookupCount = async (id: string) => {
    const { data, error } = await supabase
      .from("user_book_words")
      .select("surface, meaning, page_number, chapter_number, chapter_name, created_at")
      .eq("user_book_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading lookup count:", error);
      setUniqueLookupCount(null);
      setLastSavedWord("");
      setLastSavedWordPage(null);
      setLastSavedChapter("");
      return;
    }

    const rows = (data ?? []) as LookupRow[];
    const newestWord = rows.find((r) => (r.surface ?? "").trim() || (r.meaning ?? "").trim());
    setLastSavedWord((newestWord?.surface ?? newestWord?.meaning ?? "").trim());
    setLastSavedWordPage(newestWord?.page_number ?? null);
    const furthestChapterWord =
      rows
        .filter((r) => (r.surface ?? "").trim() || (r.meaning ?? "").trim())
        .filter((r) => r.chapter_number != null || (r.chapter_name ?? "").trim())
        .sort((a, b) => {
          const aChapter = a.chapter_number ?? Number.NEGATIVE_INFINITY;
          const bChapter = b.chapter_number ?? Number.NEGATIVE_INFINITY;
          if (aChapter !== bChapter) return bChapter - aChapter;
          return String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""));
        })[0] ?? null;
    const newestChapterName = (furthestChapterWord?.chapter_name ?? "").trim();
    const newestChapterNumber = furthestChapterWord?.chapter_number;
    setLastSavedChapter(
      newestChapterName ||
      (newestChapterNumber != null ? `Chapter ${newestChapterNumber}` : "")
    );

    const set = new Set<string>();
    for (const r of rows) {
      const surface = (r.surface ?? "").trim();
      const meaning = (r.meaning ?? "").trim();
      if (!surface && !meaning) continue;
      set.add(`${surface}|||${meaning}`);
    }

    setUniqueLookupCount(set.size);
  };

  const load = async () => {
    if (!userBookId) return;

    setLoading(true);
    setError(null);
    setCanUseStoryNotes(false);
    setCanUseCuriosityReading(false);
    setCanUseSavedWordReading(false);
    setCanUseStudyFlashcards(false);
    setCanUseVocabularyList(false);
    setCanSeeVocabularySummary(false);
    setStudentWorkspaceBackContext(null);

    const {
      data: { session },
      error: authErr,
    } = await supabase.auth.getSession();

    const user = session?.user ?? null;

    if (authErr || !user) {
      setError("Please sign in.");
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const { data: meProfile, error: meProfileErr } = await supabase
      .from("profiles")
      .select("role, is_super_teacher, level, app_access_type, app_access_expires_at")
      .eq("id", user.id)
      .single();

    if (meProfileErr) {
      console.error("Error loading profile role:", meProfileErr);
    }

    const currentProfileRole = (meProfile?.role as ProfileRole | null) ?? "member";
    const currentProfileIsSuperTeacher =
      currentProfileRole === "super_teacher" ||
      isSuperTeacherFlag(meProfile?.is_super_teacher);

    setMyRole(currentProfileRole);
    setIsSuperTeacher(currentProfileIsSuperTeacher);
    setProfileLevel(meProfile?.level ?? "");

    const appAccessStatus = meProfile
      ? getAppAccessStatus({
        role: currentProfileIsSuperTeacher ? "super_teacher" : currentProfileRole,
        app_access_type: (meProfile as any).app_access_type,
        app_access_expires_at: (meProfile as any).app_access_expires_at,
      })
      : { hasAccess: false, hasFullAccess: false, reason: "missing_profile" };

    const featureAccess = getFeatureAccess({
      role: currentProfileIsSuperTeacher ? "super_teacher" : currentProfileRole,

      // Book Hub stays free, but these two tabs use full-access saved-vocab/private-note tools.
      hasFullAccess: appAccessStatus.hasFullAccess
    });

    setCanUseStoryNotes(canUseFullAccessFeature(featureAccess, "story_notes"));
    setCanUseCuriosityReading(
      canUseFullAccessFeature(featureAccess, "curiosity_reading")
    );
    setCanUseSavedWordReading(
      canUseFullAccessFeature(featureAccess, "saved_word_reading")
    );
    setCanUseStudyFlashcards(
      canUseFullAccessFeature(featureAccess, "study_flashcards")
    );
    setCanUseVocabularyList(
      canUseFullAccessFeature(featureAccess, "vocabulary_list")
    );
    setCanSeeVocabularySummary(featureAccess.canSeeVocabularyColors);

    const bookHubSelect = `
        id,
        user_id,
        book_id,
        started_at,
        finished_at,
        dnf_at,
        dnf_reason,
        dnf_note,
        would_retry,
        notes,
        my_review,
        reader_advice,
        rating_overall,
        rating_recommend,
        rating_difficulty,
        teacher_student_use_rating,
        reader_level,
        recommended_level,
        favorite_quotes,
        memorable_words,
        format_type,
        progress_mode,
        show_page_numbers,
        is_teacher_prep,
        teacher_prep_kind,
        prepared_by,
        source_user_book_id,
        assigned_from_prep_at,
        books (
          id,
          title,
          title_reading,
          author,
          author_english_name,
          translator,
          translator_english_name,
          illustrator,
          illustrator_english_name,
          cover_url,
          genre,
          book_type,
          language_code,
          edition_format,
          edition_note,
          audience_category,
          trigger_warnings,
          page_count,
          series_number,
          series_total,
          isbn,
          isbn13,
          publisher,
          publisher_id,
          published_date,
          publisher_reading,
          publisher_image_url,
          related_links,
          author_image_url,
          translator_image_url,
          illustrator_image_url,
          author_reading,
          translator_reading,
          illustrator_reading
        )
      `;

    let { data, error } = await supabase
      .from("user_books")
      .select(bookHubSelect)
      .eq("id", userBookId)
      .maybeSingle();

    if (error && isMissingSeriesTotalColumnError(error)) {
      const retry = await supabase
        .from("user_books")
        .select(bookHubSelect.replace(/\n\s*series_total,/u, ""))
        .eq("id", userBookId)
        .maybeSingle();

      data = retry.data as unknown as typeof data;
      error = retry.error;
    }

    if (error) {
      console.error("Error loading Book Hub row:", error);
      setRow(null);
      setError("This book could not be found.");
      setLoading(false);
      return;
    }

    if (!data) {
      setRow(null);
      setError("You do not have access to this book.");
      setLoading(false);
      return;
    }

    const r = data as unknown as UserBook;
    let canAccessBook =
      r.user_id === user.id ||
      currentProfileIsSuperTeacher;

    if (!canAccessBook && currentProfileRole === "teacher") {
      const { data: teacherStudentLink, error: teacherStudentAccessError } = await supabase
        .from("teacher_students")
        .select("id")
        .eq("teacher_id", user.id)
        .eq("student_id", r.user_id)
        .limit(1)
        .maybeSingle();

      if (teacherStudentAccessError) {
        console.error("Error checking Book Hub teacher access:", teacherStudentAccessError);
      }

      canAccessBook = !!teacherStudentLink;
    }

    if (!canAccessBook) {
      setRow(null);
      setError("You do not have access to this book.");
      setLoading(false);
      return;
    }

    setRow(r);

    setBookHubOwnerName("");

    if (r.user_id && r.user_id !== user.id) {
      const { data: ownerProfile, error: ownerProfileError } = await supabase
        .from("profiles")
        .select("display_name, username")
        .eq("id", r.user_id)
        .maybeSingle();

      if (ownerProfileError) {
        console.error("Error loading Book Hub owner profile:", ownerProfileError);
      }

      setBookHubOwnerName(
        ownerProfile?.display_name || ownerProfile?.username || "Student"
      );
    }

    const workspaceBackContext = await resolveStudentWorkspaceBackContext({
      supabase,
      from: searchParams.get("from"),
      requestedStudentId: searchParams.get("studentId"),
      currentUserId: user.id,
      profile: meProfile,
      ownerUserId: r.user_id,
    });
    setStudentWorkspaceBackContext(workspaceBackContext);

    const studentUserId = r.user_id ?? null;

    const isUuid =
      typeof studentUserId === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(studentUserId);

    if (!isUuid) {
      setIsLinkedStudentToAnyTeacher(false);
      return;
    }

    const { data: teacherLinks, error: teacherLinkError } = await supabase
      .from("teacher_students")
      .select("id")
      .eq("student_id", studentUserId);

    if (teacherLinkError) {
      console.error("Error checking teacher_students link:", teacherLinkError);
      setIsLinkedStudentToAnyTeacher(false);
    } else {
      setIsLinkedStudentToAnyTeacher((teacherLinks?.length ?? 0) > 0);
    }

    setStartedAt(r.started_at ? formatYmd(new Date(r.started_at)) : "");
    setFinishedAt(r.finished_at ? formatYmd(new Date(r.finished_at)) : "");
    setDnfAt(r.dnf_at ? formatYmd(new Date(r.dnf_at)) : "");
    setDnfReason(r.dnf_reason ?? "");
    setDnfNote(r.dnf_note ?? "");
    setWouldRetry(r.would_retry ?? "");
    setNotes(r.notes ?? "");
    setMyReview(r.my_review ?? "");
    setReaderAdvice(r.reader_advice ?? "");

    setRatingOverall(r.rating_overall != null ? String(r.rating_overall) : "");
    setRatingRecommend(r.rating_recommend != null ? String(r.rating_recommend) : "");
    setRatingDifficulty(r.rating_difficulty != null ? String(r.rating_difficulty) : "");
    setTeacherStudentUseRating(
      r.teacher_student_use_rating != null ? String(r.teacher_student_use_rating) : ""
    );
    setFavoriteQuotes((r as any).favorite_quotes ?? "");
    setMemorableWords((r as any).memorable_words ?? "");

    setReaderLevel(r.reader_level ?? meProfile?.level ?? "");
    setRecommendedLevel(r.recommended_level ?? "");
    setFormatType(r.format_type ?? "");
    setProgressMode(r.progress_mode ?? "");
    setShowPageNumbers(r.show_page_numbers ?? true);

    const b = r.books as Book | null;
    setTitleReading(b?.title_reading ?? "");
    setBookType(b?.book_type ?? "");
    setEditionFormat(b?.edition_format ?? "");
    setEditionNote(b?.edition_note ?? "");
    setPublishedDate(b?.published_date ?? "");
    setPageCount(b?.page_count != null ? String(b.page_count) : "");
    setSeriesNumber(b?.series_number != null ? String(b.series_number) : "");
    setSeriesTotal(b?.series_total != null ? String(b.series_total) : "");
    setIsbn(b?.isbn ?? "");
    setIsbn13(b?.isbn13 ?? "");

    setAuthorName(b?.author ?? "");
    setTranslatorName(b?.translator ?? "");
    setIllustratorName(b?.illustrator ?? "");
    setAuthorEnglishName(b?.author_english_name ?? "");
    setTranslatorEnglishName(b?.translator_english_name ?? "");
    setIllustratorEnglishName(b?.illustrator_english_name ?? "");
    setPublisherName(b?.publisher ?? "");
    setPublisherReading(b?.publisher_reading ?? "");
    setPublisherEnglishName("");
    setSelectedAuthorId(null);
    setSelectedTranslatorId(null);
    setSelectedIllustratorId(null);
    setSelectedPublisherId(b?.publisher_id ?? null);
    setRequireSharedAuthorRecord(false);
    setRequireSharedTranslatorRecord(false);
    setRequireSharedIllustratorRecord(false);
    setRequireSharedPublisherRecord(false);

    setCoverUrl(b?.cover_url ?? "");
    setAuthorImg(b?.author_image_url ?? "");
    setTranslatorImg(b?.translator_image_url ?? "");
    setIllustratorImg(b?.illustrator_image_url ?? "");
    setPublisherImg(b?.publisher_image_url ?? "");

    setAuthorReading(b?.author_reading ?? "");
    setTranslatorReading(b?.translator_reading ?? "");
    setIllustratorReading(b?.illustrator_reading ?? "");

    setLinksText(linksToText(b?.related_links));
    await hydrateLinkedPeopleAndPublisher(b);

    await loadCommunityContributions(b?.id ?? "", user.id, b ?? undefined);

    if (featureAccess.canSeeVocabularyColors) {
      await loadUniqueLookupCount(r.id);
    } else {
      setUniqueLookupCount(null);
      setLastSavedWord("");
      setLastSavedWordPage(null);
      setLastSavedChapter("");
    }
    await loadReadingSessions(r.id);
    await loadChapterSummaries(r.id);
    await loadCharacters(r.id);
    await loadSavedKanjiDefaults(r.id);
    setKanjiMapQueue([]);

    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userBookId, searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const requestedTab = params.get("tab") ?? window.location.hash.replace(/^#/, "");
    const normalizedTab =
      requestedTab === "vocab" || requestedTab === "vocabulary"
        ? "bookInfo"
        : requestedTab;

    if (
      normalizedTab === "bookInfo" ||
      normalizedTab === "reading" ||
      normalizedTab === "story" ||
      normalizedTab === "reflection"
    ) {
      setActiveTab(normalizedTab);
    }
  }, []);

  useEffect(() => {
    async function loadBookOptions() {
      if (!userId) return;

      const { data, error } = await supabase
        .from("user_books")
        .select(`
          id,
          user_id,
          started_at,
          finished_at,
          dnf_at,
          books (
            title
          )
        `)
        .eq("user_id", userId);

      if (error) {
        console.error("Error loading book options:", error);
        setBookOptions([]);
        return;
      }

      setBookOptions(
        (data ?? []).map((item: any) => ({
          id: item.id,
          title: item.books?.title ?? "Untitled",
          started_at: item.started_at ?? null,
          finished_at: item.finished_at ?? null,
          dnf_at: item.dnf_at ?? null,
        }))
      );
    }

    loadBookOptions();
  }, [userId]);

  useEffect(() => {
    if (!isRunning || !startTime) return;

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, startTime]);

  useEffect(() => {
    const shouldWarn = isRunning || isPaused;

    if (!shouldWarn) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isRunning, isPaused]);

  const confirmLeaveIfTimerActive = () => {
    if (isRunning || isPaused) {
      return window.confirm(
        "Timer is active. If you leave the Book Hub or refresh the page, you may lose your session. Continue?"
      );
    }
    return true;
  };

  const cancelEdits = () => {
    if (!row) return;

    setEditingTab(null);

    setStartedAt(row.started_at ? formatYmd(new Date(row.started_at)) : "");
    setFinishedAt(row.finished_at ? formatYmd(new Date(row.finished_at)) : "");
    setDnfAt(row.dnf_at ? formatYmd(new Date(row.dnf_at)) : "");
    setDnfReason(row.dnf_reason ?? "");
    setDnfNote(row.dnf_note ?? "");
    setWouldRetry(row.would_retry ?? "");
    setNotes(row.notes ?? "");
    setMyReview(row.my_review ?? "");
    setReaderAdvice(row.reader_advice ?? "");

    setRatingOverall(row.rating_overall != null ? String(row.rating_overall) : "");
    setRatingRecommend(row.rating_recommend != null ? String(row.rating_recommend) : "");
    setRatingDifficulty(row.rating_difficulty != null ? String(row.rating_difficulty) : "");
    setTeacherStudentUseRating(
      row.teacher_student_use_rating != null ? String(row.teacher_student_use_rating) : ""
    );
    setFavoriteQuotes((row as any).favorite_quotes ?? "");
    setMemorableWords((row as any).memorable_words ?? "");

    setReaderLevel(row.reader_level ?? profileLevel ?? "");
    setRecommendedLevel(row.recommended_level ?? "");

    setFormatType(row.format_type ?? "");
    setProgressMode(row.progress_mode ?? "");
    setShowPageNumbers(row.show_page_numbers ?? true);

    const b = row.books;
    setBookType(b?.book_type ?? "");
    setEditionFormat(b?.edition_format ?? "");
    setEditionNote(b?.edition_note ?? "");
    setPublishedDate(b?.published_date ?? "");
    setPageCount(b?.page_count != null ? String(b.page_count) : "");
    setSeriesNumber(b?.series_number != null ? String(b.series_number) : "");
    setSeriesTotal(b?.series_total != null ? String(b.series_total) : "");
    setIsbn(b?.isbn ?? "");
    setIsbn13(b?.isbn13 ?? "");

    setAuthorName(b?.author ?? "");
    setTranslatorName(b?.translator ?? "");
    setIllustratorName(b?.illustrator ?? "");
    setAuthorEnglishName(b?.author_english_name ?? "");
    setTranslatorEnglishName(b?.translator_english_name ?? "");
    setIllustratorEnglishName(b?.illustrator_english_name ?? "");
    setPublisherName(b?.publisher ?? "");
    setPublisherReading(b?.publisher_reading ?? "");
    setPublisherEnglishName("");
    setSelectedAuthorId(null);
    setSelectedTranslatorId(null);
    setSelectedIllustratorId(null);
    setSelectedPublisherId(b?.publisher_id ?? null);
    setRequireSharedAuthorRecord(false);
    setRequireSharedTranslatorRecord(false);
    setRequireSharedIllustratorRecord(false);
    setRequireSharedPublisherRecord(false);

    setCoverUrl(b?.cover_url ?? "");
    setAuthorImg(b?.author_image_url ?? "");
    setTranslatorImg(b?.translator_image_url ?? "");
    setIllustratorImg(b?.illustrator_image_url ?? "");
    setPublisherImg(b?.publisher_image_url ?? "");

    setAuthorReading(b?.author_reading ?? "");
    setTranslatorReading(b?.translator_reading ?? "");
    setIllustratorReading(b?.illustrator_reading ?? "");

    setLinksText(linksToText(b?.related_links));
    setGenre(savedCommunityGenres);
    setTriggerWarnings(savedCommunityContentNotes);
    void hydrateLinkedPeopleAndPublisher(b);
  };

  function normalizeName(value: string) {
    return value.trim().replace(/\s+/g, " ").toLowerCase();
  }

  async function hydrateLinkedPeopleAndPublisher(book: Book | null) {
    if (!book?.id) return;

    if (book.publisher_id) {
      const { data: publisher } = await supabase
        .from("publishers")
        .select("id, name_ja, name_en, reading, logo_url")
        .eq("id", book.publisher_id)
        .maybeSingle();

      if (publisher) {
        setSelectedPublisherId(publisher.id);
        setPublisherName(publisher.name_ja ?? book.publisher ?? "");
        setPublisherEnglishName(publisher.name_en ?? "");
        setPublisherReading(publisher.reading ?? book.publisher_reading ?? "");
        setPublisherImg(publisher.logo_url ?? book.publisher_image_url ?? "");
      }
    }

    const { data: contributorData } = await supabase
      .from("book_contributors")
      .select("role, people!inner(id, name_ja, name_en, reading, image_url)")
      .eq("book_id", book.id)
      .in("role", ["author", "translator", "illustrator"]);

    const contributors = (contributorData ?? []) as Array<{
      role: "author" | "translator" | "illustrator";
      people:
      | {
        id: string;
        name_ja: string;
        name_en: string | null;
        reading: string | null;
        image_url: string | null;
      }
      | Array<{
        id: string;
        name_ja: string;
        name_en: string | null;
        reading: string | null;
        image_url: string | null;
      }>
      | null;
    }>;

    for (const contributor of contributors) {
      const person = Array.isArray(contributor.people)
        ? contributor.people[0]
        : contributor.people;

      if (!person) continue;

      if (contributor.role === "author") {
        setSelectedAuthorId(person.id);
        setAuthorName(person.name_ja ?? book.author ?? "");
        setAuthorEnglishName(person.name_en ?? "");
        setAuthorReading(person.reading ?? book.author_reading ?? "");
        setAuthorImg(person.image_url ?? book.author_image_url ?? "");
      } else if (contributor.role === "translator") {
        setSelectedTranslatorId(person.id);
        setTranslatorName(person.name_ja ?? book.translator ?? "");
        setTranslatorEnglishName(person.name_en ?? "");
        setTranslatorReading(person.reading ?? book.translator_reading ?? "");
        setTranslatorImg(person.image_url ?? book.translator_image_url ?? "");
      } else if (contributor.role === "illustrator") {
        setSelectedIllustratorId(person.id);
        setIllustratorName(person.name_ja ?? book.illustrator ?? "");
        setIllustratorEnglishName(person.name_en ?? "");
        setIllustratorReading(person.reading ?? book.illustrator_reading ?? "");
        setIllustratorImg(person.image_url ?? book.illustrator_image_url ?? "");
      }
    }
  }

  async function upsertPublisherRecord() {
    const cleanedName = publisherName.trim().replace(/\s+/g, " ");
    if (!cleanedName) return null;

    if (selectedPublisherId) {
      return { id: selectedPublisherId, name_ja: cleanedName };
    }

    const normalized = normalizeName(cleanedName);

    const { data, error } = await supabase
      .from("publishers")
      .upsert(
        {
          name_ja: cleanedName,
          name_en: publisherEnglishName.trim() || null,
          reading: publisherReading.trim() || null,
          logo_url: publisherImg.trim() || null,
          normalized_name: normalized,
        },
        {
          onConflict: "normalized_name",
          ignoreDuplicates: false,
        }
      )
      .select("id, name_ja")
      .single();

    if (error) {
      const fallback = await supabase
        .from("publishers")
        .select("id, name_ja")
        .eq("normalized_name", normalized)
        .maybeSingle();

      if (fallback.data) return fallback.data;

      console.warn("Could not upsert publisher record; saving book publisher text only:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fallbackMessage: fallback.error?.message,
      });
      return null;
    }

    return data;
  }

  async function ensureStrictPublisherRecord() {
    if (!requireSharedPublisherRecord || selectedPublisherId || !publisherName.trim()) {
      return { data: null as { id: string; name_ja: string } | null, error: null as Error | null };
    }

    const publisherRecord = await upsertPublisherRecord();
    if (!publisherRecord) {
      return {
        data: null,
        error: new Error("Could not create a shared publisher record. Please try again."),
      };
    }

    return { data: publisherRecord, error: null };
  }

  async function upsertPersonRecord({
    selectedId,
    name,
    englishName,
    reading,
    imageUrl,
  }: {
    selectedId: string | null;
    name: string;
    englishName: string;
    reading: string;
    imageUrl: string;
  }) {
    const cleanedName = name.trim().replace(/\s+/g, " ");
    if (!cleanedName) return { data: null, error: null, dbErrorMessage: null as string | null };

    if (selectedId) {
      const { data, error } = await supabase
        .from("people")
        .update({
          name_ja: cleanedName,
          name_en: englishName.trim() || null,
          reading: reading.trim() || null,
          image_url: imageUrl.trim() || null,
        })
        .eq("id", selectedId)
        .select("id")
        .single();

      if (error) {
        console.warn(
          "Could not update selected person record; keeping the existing link instead:",
          error
        );
        return {
          data: { id: selectedId },
          error: null,
          dbErrorMessage: error.message,
          mode: "kept-existing-link" as const,
        };
      }

      return { data, error: null, dbErrorMessage: null, mode: "updated-existing" as const };
    }

    const normalized = normalizeName(cleanedName);

    const { data, error } = await supabase
      .from("people")
      .upsert(
        {
          name_ja: cleanedName,
          name_en: englishName.trim() || null,
          reading: reading.trim() || null,
          image_url: imageUrl.trim() || null,
          normalized_name: normalized,
        },
        {
          onConflict: "normalized_name",
          ignoreDuplicates: false,
        }
      )
      .select("id")
      .single();

    if (error) {
      console.warn(
        "Could not create shared person record; saving the book text only:",
        error
      );
      return {
        data: null,
        error: null,
        dbErrorMessage: error.message,
        mode: "saved-book-only" as const,
      };
    }

    return { data, error: null, dbErrorMessage: null, mode: "created-or-linked" as const };
  }

  async function ensureStrictPersonRecord(draft: {
    selectedId: string | null;
    name: string;
    englishName: string;
    reading: string;
    imageUrl: string;
    requireSharedRecord: boolean;
    roleLabel: string;
  }) {
    if (!draft.requireSharedRecord || draft.selectedId || !draft.name.trim()) {
      return { id: null as string | null, error: null as Error | null };
    }

    const { data, dbErrorMessage } = await upsertPersonRecord(draft);
    if (!data) {
      return {
        id: null,
        error: new Error(
          dbErrorMessage
            ? `Could not create a shared ${draft.roleLabel} record: ${dbErrorMessage}`
            : `Could not create a shared ${draft.roleLabel} record. The book was not saved so you can try again.`
        ),
      };
    }

    return { id: data.id, error: null };
  }

  async function syncContributorRole(
    bookId: string,
    role: "author" | "translator" | "illustrator",
    personDraft: {
      selectedId: string | null;
      name: string;
      englishName: string;
      reading: string;
      imageUrl: string;
    },
    forcedPersonId?: string | null,
    forcedStatus?: "created-shared-record" | "linked-existing-record"
  ) {
    const { error: deleteError } = await supabase
      .from("book_contributors")
      .delete()
      .eq("book_id", bookId)
      .eq("role", role);

    if (deleteError) {
      console.error(`Error clearing existing ${role} contributor:`, deleteError);
      return { error: deleteError, status: "error" as const };
    }

    if (!personDraft.name.trim()) {
      return { error: null, status: "empty" as const };
    }

    let person = forcedPersonId ? { id: forcedPersonId } : null;
    let mode: "kept-existing-link" | "updated-existing" | "saved-book-only" | "created-or-linked" =
      "kept-existing-link";

    if (!person) {
      const result = await upsertPersonRecord(personDraft);
      person = result.data;
      mode = result.mode ?? "saved-book-only";
      if (result.error) return { error: result.error, status: "error" as const };
    }

    if (!person) {
      return {
        error: null,
        status: mode === "saved-book-only" ? "saved-book-only" : "empty",
      };
    }

    const { error: insertError } = await supabase
      .from("book_contributors")
      .upsert(
        {
          book_id: bookId,
          person_id: person.id,
          role,
          display_order: 1,
        },
        {
          onConflict: "book_id,person_id,role,display_order",
          ignoreDuplicates: false,
        }
      );

    if (insertError) {
      console.error(`Error linking ${role} contributor:`, insertError);
      return { error: insertError, status: "error" as const };
    }

    return {
      error: null,
      status:
        forcedStatus ??
        (mode === "created-or-linked" ? "created-shared-record" :
          mode === "updated-existing" || mode === "kept-existing-link" ? "linked-existing-record" :
            "linked-existing-record"),
    };
  }

  async function saveReadingReflectionFields() {
    if (!row?.id) {
      setError("Book record is not loaded yet.");
      return;
    }

    setSaving(true);
    setError("");
    setSaveNotice("");

    try {
      const ro = ratingOverall.trim()
        ? clampRating5(Number(ratingOverall.trim()))
        : null;
      const rd = ratingDifficulty.trim()
        ? clampRating5(Number(ratingDifficulty.trim()))
        : null;
      const reflectionReaderLevel = profileLevel || readerLevel || null;

      const { error: userBookError } = await supabase
        .from("user_books")
        .update({
          my_review: myReview.trim() || null,
          reader_advice: readerAdvice.trim().slice(0, 160) || null,
          rating_overall: ro,
          rating_difficulty: rd,
          reader_level: reflectionReaderLevel,
          favorite_quotes: favoriteQuotes.trim() || null,
          memorable_words: memorableWords.trim() || null,
        })
        .eq("id", row.id);

      if (userBookError) throw userBookError;

      await syncBookRecommendationSignal({
        userBookId: row.id,
        bookId: row.books?.id ?? null,
        ownerUserId: row.user_id,
        readerLevel: reflectionReaderLevel,
        bookType: bookType || row.books?.book_type || null,
        entertainmentRating: ro,
        difficultyRating: rd,
        readerAdvice: readerAdvice.trim().slice(0, 160) || null,
      });

      if (row.books?.id) {
        await saveCommunityContributions(row.books.id, userId);
      }

      setSaveNoticeTone("success");
      setSaveNotice("Saved.");
      setEditingTab(null);
      await load();
    } catch (saveError: any) {
      console.error("Error saving reading reflection fields:", {
        message: saveError?.message,
        details: saveError?.details,
        hint: saveError?.hint,
        code: saveError?.code,
        raw: saveError,
      });

      setError(saveError?.message ?? "Could not save reading reflection fields.");
    } finally {
      setSaving(false);
    }
  }

  const saveAll = async () => {
    if (!row?.id || !row.books?.id) return;

    const canSaveSharedBookInfo =
      myRole === "super_teacher" || isSuperTeacherFlag(isSuperTeacher);

    if (isBookInfoEditingTab && !canSaveSharedBookInfo) {
      setEditingTab(null);
      setError("Only super teachers can edit shared book information.");
      return;
    }

    setSaving(true);
    setError(null);
    setSaveNotice(null);

    if (
      editingTab === "communityGenres" ||
      editingTab === "communityContentNotes"
    ) {
      try {
        if (editingTab === "communityGenres" || editingTab === "communityContentNotes") {
          await saveCommunityContributions(row.books.id, userId);
        }

        setSaveNoticeTone("success");
        setSaveNotice("Saved.");
        setEditingTab(null);
        await load();
      } catch (saveError: any) {
        console.error("Error saving community fields:", saveError);
        setError(saveError?.message ?? "Could not save community fields.");
      } finally {
        setSaving(false);
      }

      return;
    }

    const strictPublisherResult = await ensureStrictPublisherRecord();
    if (strictPublisherResult.error) {
      setError(strictPublisherResult.error.message);
      setSaving(false);
      return;
    }

    const strictContributorResults = await Promise.all([
      ensureStrictPersonRecord({
        selectedId: selectedAuthorId,
        name: authorName,
        englishName: authorEnglishName,
        reading: authorReading,
        imageUrl: authorImg,
        requireSharedRecord: requireSharedAuthorRecord,
        roleLabel: "author",
      }),
      ensureStrictPersonRecord({
        selectedId: selectedTranslatorId,
        name: translatorName,
        englishName: translatorEnglishName,
        reading: translatorReading,
        imageUrl: translatorImg,
        requireSharedRecord: requireSharedTranslatorRecord,
        roleLabel: "translator",
      }),
      ensureStrictPersonRecord({
        selectedId: selectedIllustratorId,
        name: illustratorName,
        englishName: illustratorEnglishName,
        reading: illustratorReading,
        imageUrl: illustratorImg,
        requireSharedRecord: requireSharedIllustratorRecord,
        roleLabel: "illustrator",
      }),
    ]);

    const strictContributorError = strictContributorResults.find((item) => item.error)?.error;
    if (strictContributorError) {
      setError(strictContributorError.message);
      setSaving(false);
      return;
    }

    const started_at = startedAt.trim() ? startedAt.trim() : null;
    const finished_at = finishedAt.trim() ? finishedAt.trim() : null;
    const dnf_at = dnfAt.trim() ? dnfAt.trim() : null;
    const nextDnfReason = dnf_at && dnfReason.trim() ? dnfReason.trim() : null;
    const nextDnfNote = dnf_at && dnfNote.trim() ? dnfNote.trim() : null;
    const nextWouldRetry = dnf_at && wouldRetry.trim() ? wouldRetry.trim() : null;

    const status =
      dnf_at ? "did_not_finish" :
        finished_at ? "finished" :
          started_at ? "reading" :
            "what_to_read";

    const pc = pageCount.trim() ? Number(pageCount.trim()) : null;
    const page_count = Number.isFinite(pc as any) ? (pc as number) : null;
    const sn = seriesNumber.trim() ? Number(seriesNumber.trim()) : null;
    const series_number = Number.isFinite(sn as any) ? (sn as number) : null;
    const st = seriesTotal.trim() ? Number(seriesTotal.trim()) : null;
    const series_total = Number.isFinite(st as any) ? (st as number) : null;

    const ro = ratingOverall.trim() ? clampRating5(Number(ratingOverall.trim())) : null;
    const rr = ratingRecommend.trim() ? clampRating5(Number(ratingRecommend.trim())) : null;
    const rd = ratingDifficulty.trim() ? clampRating5(Number(ratingDifficulty.trim())) : null;
    const tsur = teacherStudentUseRating.trim()
      ? clampRating5(Number(teacherStudentUseRating.trim()))
      : null;

    const related_links = linksText.trim() ? parseLinks(linksText) : null;
    const publisherRecord = strictPublisherResult.data ?? (await upsertPublisherRecord());

    if (row.books?.id) {
      await saveCommunityContributions(row.books.id, userId);
    }

    const userBooksUpdate = supabase
      .from("user_books")
      .update({
        status,
        started_at,
        finished_at,
        dnf_at,
        dnf_reason: nextDnfReason,
        dnf_note: nextDnfNote,
        would_retry: nextWouldRetry,
        notes: notes || null,
        my_review: myReview || null,
        reader_advice: readerAdvice.trim().slice(0, 160) || null,
        rating_overall: ro,
        rating_recommend: rr,
        rating_difficulty: rd,
        teacher_student_use_rating: tsur,
        favorite_quotes: favoriteQuotes.trim() || null,
        memorable_words: memorableWords.trim() || null,
        reader_level: readerLevel || profileLevel || null,
        recommended_level: recommendedLevel || null,
        format_type: formatType || null,
        progress_mode: progressMode || null,
        show_page_numbers: showPageNumbers,
      })
      .eq("id", row.id);

    const bookUpdatePayload = {
      title_reading: titleReading || null,
      author: authorName || null,
      author_english_name: authorEnglishName || null,
      translator: translatorName || null,
      translator_english_name: translatorEnglishName || null,
      illustrator: illustratorName || null,
      illustrator_english_name: illustratorEnglishName || null,
      publisher: publisherRecord?.name_ja ?? (publisherName || null),
      publisher_id: publisherRecord?.id ?? null,
      published_date: publishedDate || null,
      book_type: bookType || null,
      edition_format: editionFormat || null,
      edition_note: editionNote.trim() || null,
      page_count,
      series_number,
      series_total,
      isbn: isbn || null,
      isbn13: isbn13 || null,
      publisher_reading: publisherReading || null,
      publisher_image_url: publisherImg || null,
      related_links,
      cover_url: coverUrl || null,
      author_image_url: authorImg || null,
      translator_image_url: translatorImg || null,
      illustrator_image_url: illustratorImg || null,
      author_reading: authorReading || null,
      translator_reading: translatorReading || null,
      illustrator_reading: illustratorReading || null,
    };

    const booksUpdate = supabase
      .from("books")
      .update(bookUpdatePayload)
      .eq("id", row.books.id);

    const [uRes, bRes] = await Promise.all([userBooksUpdate, booksUpdate]);
    let bookSaveWarning: string | null = null;
    let finalBookError = bRes.error;

    if (finalBookError && isDuplicateBookIsbnError(finalBookError)) {
      const { isbn: _isbn, isbn13: _isbn13, ...bookUpdateWithoutIsbn } = bookUpdatePayload;
      const retryResult = await supabase
        .from("books")
        .update(bookUpdateWithoutIsbn)
        .eq("id", row.books.id);

      finalBookError = retryResult.error;
      if (!finalBookError) {
        bookSaveWarning =
          "Saved book details, but kept the existing ISBN because that ISBN already belongs to another book record.";
      }
    }

    if (uRes.error || finalBookError) {
      setError(
        `user_books: ${uRes.error?.message ?? "ok"} | books: ${finalBookError?.message ?? "ok"}`
      );
      setSaving(false);
      return;
    }

    await syncBookRecommendationSignal({
      userBookId: row.id,
      bookId: row.books.id,
      ownerUserId: row.user_id,
      readerLevel: readerLevel || profileLevel || null,
      bookType: bookType || row.books.book_type || null,
      entertainmentRating: ro,
      difficultyRating: rd,
      readerAdvice: readerAdvice.trim().slice(0, 160) || null,
    });

    const contributorSyncs = [
      {
        role: "author" as const,
        draft: {
          selectedId: selectedAuthorId,
          name: authorName,
          englishName: authorEnglishName,
          reading: authorReading,
          imageUrl: authorImg,
        },
        forcedPersonId: strictContributorResults[0]?.id ?? null,
        forcedStatus: strictContributorResults[0]?.id ? "created-shared-record" as const : undefined,
      },
      {
        role: "translator" as const,
        draft: {
          selectedId: selectedTranslatorId,
          name: translatorName,
          englishName: translatorEnglishName,
          reading: translatorReading,
          imageUrl: translatorImg,
        },
        forcedPersonId: strictContributorResults[1]?.id ?? null,
        forcedStatus: strictContributorResults[1]?.id ? "created-shared-record" as const : undefined,
      },
      {
        role: "illustrator" as const,
        draft: {
          selectedId: selectedIllustratorId,
          name: illustratorName,
          englishName: illustratorEnglishName,
          reading: illustratorReading,
          imageUrl: illustratorImg,
        },
        forcedPersonId: strictContributorResults[2]?.id ?? null,
        forcedStatus: strictContributorResults[2]?.id ? "created-shared-record" as const : undefined,
      },
    ];

    const createdSharedRoles: string[] = [];
    const linkedSharedRoles: string[] = [];
    const savedBookOnlyRoles: string[] = [];

    for (const syncItem of contributorSyncs) {
      const contributorSyncResult = await syncContributorRole(
        row.books.id,
        syncItem.role,
        syncItem.draft,
        syncItem.forcedPersonId,
        syncItem.forcedStatus
      );

      if (contributorSyncResult.error) {
        setError(`${syncItem.role}: ${contributorSyncResult.error.message}`);
        setSaving(false);
        return;
      }

      if (contributorSyncResult.status === "created-shared-record") {
        createdSharedRoles.push(syncItem.role);
      } else if (contributorSyncResult.status === "linked-existing-record") {
        linkedSharedRoles.push(syncItem.role);
      } else if (contributorSyncResult.status === "saved-book-only") {
        savedBookOnlyRoles.push(syncItem.role);
      }
    }

    if (savedBookOnlyRoles.length > 0) {
      setSaveNoticeTone("warning");
      const noticeParts = [
        `Saved to the book, but not to shared people records for: ${savedBookOnlyRoles.join(", ")}.`,
      ];
      if (bookSaveWarning) noticeParts.push(bookSaveWarning);
      setSaveNotice(noticeParts.join(" "));
    } else if (createdSharedRoles.length > 0 || linkedSharedRoles.length > 0) {
      const parts: string[] = [];
      if (createdSharedRoles.length > 0) {
        parts.push(`Created shared records for: ${createdSharedRoles.join(", ")}`);
      }
      if (linkedSharedRoles.length > 0) {
        parts.push(`Linked shared records for: ${linkedSharedRoles.join(", ")}`);
      }
      if (bookSaveWarning) {
        parts.push(bookSaveWarning);
      }
      setSaveNoticeTone("success");
      setSaveNotice(parts.join(". "));
    } else if (bookSaveWarning) {
      setSaveNoticeTone("warning");
      setSaveNotice(bookSaveWarning);
    } else {
      setSaveNoticeTone("success");
      setSaveNotice("Saved.");
    }

    setEditingTab(null);
    setSaving(false);
    await load();
  };

  async function syncBookRecommendationSignal({
    userBookId,
    bookId,
    ownerUserId,
    readerLevel,
    bookType,
    entertainmentRating,
    difficultyRating,
    readerAdvice,
  }: {
    userBookId: string;
    bookId: string | null;
    ownerUserId: string;
    readerLevel: string | null;
    bookType: string | null;
    entertainmentRating: number | null;
    difficultyRating: number | null;
    readerAdvice: string | null;
  }) {
    if (!bookId || !ownerUserId) return;

    const hasPublicSignal =
      entertainmentRating != null ||
      difficultyRating != null ||
      !!readerAdvice;

    if (!hasPublicSignal) {
      const { error: deactivateError } = await supabase
        .from("book_recommendation_signals")
        .update({
          reader_level: readerLevel,
          book_type: bookType,
          difficulty_rating: null,
          entertainment_rating: null,
          reader_advice: null,
          is_active: false,
        })
        .eq("user_book_id", userBookId);

      if (deactivateError) throw deactivateError;
      return;
    }

    const { error: signalError } = await supabase
      .from("book_recommendation_signals")
      .upsert(
        {
          book_id: bookId,
          user_book_id: userBookId,
          user_id: ownerUserId,
          reader_level: readerLevel,
          book_type: bookType,
          difficulty_rating: difficultyRating,
          entertainment_rating: entertainmentRating,
          reader_advice: readerAdvice,
          is_active: true,
        },
        { onConflict: "user_book_id" }
      );

    if (signalError) throw signalError;
  }

  async function flagBookForTeacherReview() {
    if (!row?.id || !userId) return;

    setError(null);
    setSaveNotice(null);
    setIsSavingBookFlag(true);

    const title = row.books?.title ?? "this book";
    const cleanNote = bookFlagNote.trim();

    const message = cleanNote
      ? `Book flagged for review: ${title}\n\nNote: ${cleanNote}`
      : `Book flagged for review: ${title}`;

    const { data: superTeachers, error: superTeacherError } = await supabase
      .from("profiles")
      .select("id, role, is_super_teacher")
      .or("role.eq.super_teacher,is_super_teacher.eq.true");

    if (superTeacherError) {
      console.error("Error finding super teachers for book flag:", superTeacherError);
    }

    const recipientIds = Array.from(
      new Set(
        ((superTeachers ?? []) as any[])
          .map((profile) => profile.id)
          .filter(Boolean)
      )
    );

    if (recipientIds.length === 0) {
      setIsSavingBookFlag(false);
      alert("Could not flag this book because no super teacher account was found.");
      return;
    }

    const alerts = recipientIds.map((recipientId) => ({
      user_id: recipientId,
      user_book_id: row.id,
      type: "book_flag",
      message,
    }));

    const { error: alertError } = await supabase.from("user_alerts").insert(alerts);

    setIsSavingBookFlag(false);

    if (alertError) {
      console.error("Error flagging book for review:", alertError);
      alert(`Could not flag this book.\n${alertError.message}`);
      return;
    }

    setBookFlagNote("");
    setShowBookFlagModal(false);
    setSaveNoticeTone("success");
    setSaveNotice("Book flagged for review.");
  }

  async function removeFromMyLibrary() {
    if (!row?.id || !userId) return;

    if (row.user_id !== userId) {
      setRemoveLibraryError("You can only remove books from your own library.");
      return;
    }

    setIsRemovingFromLibrary(true);
    setRemoveLibraryError(null);
    setError(null);
    setSaveNotice(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(`/api/books/${row.id}/remove-from-library`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "Could not remove this book from your library yet.");
      }

      router.push("/books");
    } catch (err: any) {
      setRemoveLibraryError(
        err?.message ?? "Could not remove this book from your library yet."
      );
    } finally {
      setIsRemovingFromLibrary(false);
    }
  }

  async function pullQuickWord() {
    const word = quickWord.trim();
    if (!word) return;

    setQuickLoading(true);
    setQuickError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch(`/api/jisho?keyword=${encodeURIComponent(word)}`, {
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      });
      const json = await res.json();

      const first = json?.data?.[0];
      if (!first) {
        setQuickPreview(null);
        setQuickError("No result found.");
        setQuickLoading(false);
        return;
      }

      const surface =
        first?.japanese?.[0]?.word ||
        first?.slug ||
        word;

      const reading =
        first?.japanese?.[0]?.reading || "";

      const meanings =
        (first?.senses ?? [])
          .map((sense: any) => (sense.english_definitions ?? []).join("; "))
          .filter(Boolean);

      setQuickPreview({
        surface,
        cacheSurface: surface,
        reading,
        meanings: meanings.length ? meanings : [""],
        selectedMeaningIndex: 0,
        meaning: meanings.length ? meanings[0] : "",
        isCustomMeaning: false,
        useAlternateSurface: false,
        alternateSurface: "",
        page: defaultVocabPage || (furthestPage != null ? String(furthestPage + 1) : ""),
        chapterNumber: defaultChapterNumber,
        chapterName: defaultChapterName,
      });
    } catch (err) {
      console.error(err);
      setQuickPreview(null);
      setQuickError("Could not pull word data.");
    } finally {
      setQuickLoading(false);
    }
  }

  async function searchWordExplorer() {
    const query = wordExplorerQuery.trim();

    if (!query) {
      setWordExplorerResults([]);
      setWordExplorerError(null);
      return;
    }

    setWordExplorerLoading(true);
    setWordExplorerError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch(`/api/jisho?keyword=${encodeURIComponent(query)}`, {
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      });
      const json = await res.json();

      const results = (json?.data ?? []).slice(0, 8);
      setWordExplorerResults(results);

      if (results.length === 0) {
        setWordExplorerError("No results found.");
      }
    } catch (err) {
      console.error(err);
      setWordExplorerResults([]);
      setWordExplorerError("Could not load word data.");
    } finally {
      setWordExplorerLoading(false);
    }
  }

  async function saveQuickWord() {
    if (!row?.id || !quickPreview) return;

    const selectedMeaning = quickPreview.meaning ?? "";

    let vocabularyCacheId: number | null = null;

    const normalizedSurface = (
      quickPreview.useAlternateSurface
        ? quickPreview.alternateSurface
        : quickPreview.surface
    )?.trim() ?? "";
    const normalizedCacheSurface =
      quickPreview.cacheSurface?.trim() || normalizedSurface;
    const normalizedReading = quickPreview.reading?.trim() ?? "";
    const isManualEntry =
      quickPreview.isCustomMeaning && quickPreview.meanings.length === 0;

    if (normalizedCacheSurface && !isManualEntry) {
      const { data: existingCache, error: cacheLookupError } = await supabase
        .from("vocabulary_cache")
        .select("id")
        .eq("surface", normalizedCacheSurface)
        .eq("reading", normalizedReading || "")
        .maybeSingle();

      if (cacheLookupError) {
        console.error("Error looking up vocabulary cache:", cacheLookupError);
        alert(`Could not save word.\n${cacheLookupError.message}`);
        return;
      }

      if (existingCache?.id) {
        vocabularyCacheId = existingCache.id;
      } else {
        const { data: createdCache, error: cacheInsertError } = await supabase
          .from("vocabulary_cache")
          .insert({
            surface: normalizedCacheSurface,
            reading: normalizedReading || "",
          })
          .select("id")
          .single();

        if (cacheInsertError) {
          console.error("Error creating vocabulary cache row:", cacheInsertError);
          alert(`Could not save word.\n${cacheInsertError.message}`);
          return;
        }

        vocabularyCacheId = createdCache.id;
      }
    }

    const payload = {
      user_book_id: row.id,
      vocabulary_cache_id: vocabularyCacheId,
      surface: quickPreview.surface || null,
      reading: quickPreview.reading || null,
      meaning: selectedMeaning || null,
      meaning_choices: quickPreview.meanings,
      meaning_choice_index: quickPreview.isCustomMeaning
        ? null
        : quickPreview.selectedMeaningIndex,
      page_number: quickPreview.page ? Number(quickPreview.page) : null,
      chapter_number: quickPreview.chapterNumber
        ? Number(quickPreview.chapterNumber)
        : null,
      chapter_name: quickPreview.chapterName || null,
      hide_kanji_in_reading_support: hideKanjiInReadingSupport,
    };

    const { data, error } = await supabase
      .from("user_book_words")
      .insert(payload)
      .select("id, surface, reading, meaning, page_number, chapter_number, chapter_name, vocabulary_cache_id")
      .single();

    if (error) {
      console.error("Error saving quick word:", error);
      alert(`Could not save word.\n${error.message}`);
      return;
    }

    if (vocabularyCacheId && hasKanji(normalizedCacheSurface)) {
      await generateVocabularyKanjiMap(vocabularyCacheId);
    }

    setQuickSessionWords((prev) => [
      {
        id: String(data.id),
        surface: data.surface ?? "",
        reading: data.reading ?? "",
        meaning: data.meaning ?? "",
        page: data.page_number != null ? String(data.page_number) : "",
        chapterNumber: data.chapter_number != null ? String(data.chapter_number) : "",
        chapterName: data.chapter_name ?? "",
      },
      ...prev,
    ]);

    setDefaultVocabPage(quickPreview.page);
    setDefaultChapterNumber(quickPreview.chapterNumber);
    setDefaultChapterName(quickPreview.chapterName);

    setQuickWord("");
    setQuickPreview(null);
    setHideKanjiInReadingSupport(false);

    await loadUniqueLookupCount(row.id);
    quickWordInputRef.current?.focus();
  }

  function startEditingQuickSessionWord(item: {
    id: string;
    surface: string;
    reading: string;
    meaning: string;
    page: string;
    chapterNumber: string;
    chapterName: string;
  }) {
    setEditingQuickSessionId(item.id);
    setEditingQuickSessionWord({ ...item });
  }

  function cancelEditingQuickSessionWord() {
    setEditingQuickSessionId(null);
    setEditingQuickSessionWord(null);
  }

  async function saveEditedQuickSessionWord() {
    if (!editingQuickSessionWord) return;

    const payload = {
      surface: editingQuickSessionWord.surface || null,
      reading: editingQuickSessionWord.reading || null,
      meaning: editingQuickSessionWord.meaning || null,
      page_number: editingQuickSessionWord.page
        ? Number(editingQuickSessionWord.page)
        : null,
      chapter_number: editingQuickSessionWord.chapterNumber
        ? Number(editingQuickSessionWord.chapterNumber)
        : null,
      chapter_name: editingQuickSessionWord.chapterName || null,
      is_manual_override: true,
      vocabulary_cache_id: null,
    };

    const { error } = await supabase
      .from("user_book_words")
      .update(payload)
      .eq("id", editingQuickSessionWord.id);

    if (error) {
      console.error("Error updating session word:", error);
      alert(`Could not update word.\n${error.message}`);
      return;
    }

    setQuickSessionWords((prev) =>
      prev.map((item) =>
        item.id === editingQuickSessionWord.id
          ? {
            ...editingQuickSessionWord,
            is_manual_override: true,
            vocabulary_cache_id: null,
          }
          : item
      )
    );

    cancelEditingQuickSessionWord();

    if (row?.id) {
      await loadUniqueLookupCount(row.id);
    }
  }

  const curiositySessions = useMemo(() => {
    return realReadingSessions.filter((s: any) => s.session_mode === "curiosity");
  }, [realReadingSessions]);

  const fluidSessions = useMemo(() => {
    return realReadingSessions.filter((s: any) => s.session_mode === "fluid");
  }, [realReadingSessions]);

  const listeningSessions = useMemo(() => {
    return realReadingSessions.filter((s: any) => s.session_mode === "listening");
  }, [realReadingSessions]);

  const timedListeningSessions = useMemo(() => {
    return listeningSessions.filter((s) => s.minutes_read != null && s.minutes_read > 0);
  }, [listeningSessions]);

  const listeningMinutes = useMemo(() => {
    return timedListeningSessions.reduce((sum, s) => sum + (s.minutes_read ?? 0), 0);
  }, [timedListeningSessions]);

  const timedCuriositySessions = useMemo(() => {
    return curiositySessions.filter((s) => s.minutes_read != null && s.minutes_read > 0);
  }, [curiositySessions]);

  const timedFluidSessions = useMemo(() => {
    return fluidSessions.filter((s) => s.minutes_read != null && s.minutes_read > 0);
  }, [fluidSessions]);

  const curiosityMinutes = useMemo(() => {
    return timedCuriositySessions.reduce((sum, s) => sum + (s.minutes_read ?? 0), 0);
  }, [timedCuriositySessions]);

  const fluidMinutes = useMemo(() => {
    return timedFluidSessions.reduce((sum, s) => sum + (s.minutes_read ?? 0), 0);
  }, [timedFluidSessions]);

  const curiosityPages = useMemo(() => {
    return timedCuriositySessions.reduce((sum, s) => {
      if (s.start_page == null || s.end_page == null) return sum;
      return sum + (s.end_page - s.start_page + 1);
    }, 0);
  }, [timedCuriositySessions]);

  const fluidPages = useMemo(() => {
    return timedFluidSessions.reduce((sum, s) => {
      if (s.start_page == null || s.end_page == null) return sum;
      return sum + (s.end_page - s.start_page + 1);
    }, 0);
  }, [timedFluidSessions]);

  const curiosityMinPerPage = useMemo(() => {
    if (!curiosityPages) return null;
    return curiosityMinutes / curiosityPages;
  }, [curiosityMinutes, curiosityPages]);

  const fluidMinPerPage = useMemo(() => {
    if (!fluidPages) return null;
    return fluidMinutes / fluidPages;
  }, [fluidMinutes, fluidPages]);

  if (loading) {
    return <BookHubLoadingState />;
  }

  if (!row || !book) {
    if (error === "You do not have access to this book.") {
      return <AccessDeniedMessage message={error} />;
    }

    return <AccessDeniedMessage message="This book could not be found." />;
  }

  const currentlyReadingBooks = [...bookOptions]
    .filter((b) => b.started_at && !b.finished_at && !b.dnf_at)
    .sort((a, b) => a.title.localeCompare(b.title));

  const otherBooks = [...bookOptions]
    .filter((b) => !(b.started_at && !b.finished_at && !b.dnf_at))
    .sort((a, b) => a.title.localeCompare(b.title));

  const relatedLinksArr = Array.isArray(book.related_links) ? book.related_links : [];

  const isViewingStudentBookHub =
    isTeacherContext && !!row.user_id && !!userId && row.user_id !== userId;
  const canRemoveFromMyLibrary = !!userId && row.user_id === userId;

  const bookHubContextLabel = isViewingStudentBookHub
    ? `Student Book Hub · ${bookHubOwnerName || "Student"}`
    : "My Book Hub";

  const bookHubStatusLabel = dnfAt
    ? "DNF"
    : finishedAt
      ? "Finished"
      : startedAt
        ? "Reading"
        : "Not started";

  const showBookHubStartButton = !started && realReadingSessions.length === 0;
  const showBookHubFinishDnfButtons = !finishedAt && !dnfAt;
  const hasReadingReflection =
    !!myReview.trim() ||
    !!readerAdvice.trim() ||
    !!ratingOverall.trim() ||
    !!ratingDifficulty.trim() ||
    !!favoriteQuotes.trim() ||
    !!memorableWords.trim();
  const showBookHubReflectionPrompt = !!finishedAt && !hasReadingReflection;

  return (
    <main className="min-h-screen bg-stone-50 p-6">
      {showBookFlagModal ? (
        <BookFlagModal
          bookTitle={book.title ?? "Untitled book"}
          note={bookFlagNote}
          isSaving={isSavingBookFlag}
          onNoteChange={setBookFlagNote}
          onCancel={() => {
            if (isSavingBookFlag) return;
            setShowBookFlagModal(false);
            setBookFlagNote("");
          }}
          onSubmit={flagBookForTeacherReview}
        />
      ) : null}

      {showRemoveLibraryConfirm ? (
        <RemoveFromLibraryDialog
          error={removeLibraryError}
          isRemoving={isRemovingFromLibrary}
          onCancel={() => {
            if (isRemovingFromLibrary) return;
            setShowRemoveLibraryConfirm(false);
            setRemoveLibraryError(null);
          }}
          onConfirm={removeFromMyLibrary}
        />
      ) : null}

      <div className="mx-auto max-w-6xl">
        {studentWorkspaceBackContext ? (
          <Link
            href={studentWorkspaceBackContext.href}
            className="mb-3 inline-flex text-sm font-semibold text-stone-500 hover:text-stone-900"
          >
            {studentWorkspaceBackContext.label}
          </Link>
        ) : null}

        <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
          <div className="p-5 md:p-8">
            <div className="grid gap-6 md:grid-cols-[150px_minmax(0,1fr)_380px] md:items-start md:gap-8">
              <BookHubHero
                book={book}
                displayedCoverUrl={isEditingThisTab ? coverUrl : book.cover_url}
                selectedUserBookId={userBookId ?? ""}
                bookHubContextLabel={bookHubContextLabel}
                isViewingStudentBookHub={isViewingStudentBookHub}
                currentlyReadingBooks={currentlyReadingBooks}
                otherBooks={otherBooks}
                onSwitchBook={(nextValue) => {
                  if (!nextValue) return;

                  if (nextValue === "all-book-hubs") {
                    router.push("/library/book-hubs");
                    return;
                  }

                  if (nextValue === userBookId) return;

                  router.push(`/books/${nextValue}`);
                }}
              />

              <BookHubStatusPanel
                statusLabel={bookHubStatusLabel}
                startedAt={startedAt}
                finishedAt={finishedAt}
                dnfAt={dnfAt}
                dnfReason={dnfReason}
                dnfNote={dnfNote}
                wouldRetry={wouldRetry}
                showStartButton={showBookHubStartButton}
                showFinishDnfButtons={showBookHubFinishDnfButtons}
                showReflectionPrompt={showBookHubReflectionPrompt}
                shouldNudgeStartBook={shouldNudgeStartBook}
                shouldNudgeFinishBook={shouldNudgeFinishBook}
                canFillBeginningPages={canFillBeginningPages}
                canFillEndingPages={canFillEndingPages}
                earliestTrackedStartPage={earliestTrackedStartPage}
                furthestTrackedPage={furthestTrackedPage}
                pageCount={book.page_count}
                onStartToday={() => void markStartedToday()}
                onMarkFinished={() => void markFinishedToday()}
                onMarkDnf={() => void markDnfToday()}
                onOpenReflection={openReadingReflection}
                onFillBeginningPages={fillBeginningPages}
                onFillEndingPages={fillEndingPages}
              />
            </div>

            {row.is_teacher_prep && row.teacher_prep_kind === "trial" ? (
              <div className="mt-6">
                <TeacherPrepAssignBox userBookId={row.id} />
              </div>
            ) : null}

            <div className="mt-6 space-y-4">
              <BookHubProgressSummary
                progressLabel={bookHubProgressLabel}
                progressSummaryLabel={bookHubProgressSummaryLabel}
                progressBarWidth={bookHubProgressBarWidth}
                progressPercentLabel={bookHubProgressPercentLabel}
                lastSavedWordLabel={bookHubLastSavedWordLabel}
                lastChapterLabel={bookHubLastChapterLabel}
                lastPageLabel={bookHubLastPageLabel}
                daysEngagedLabel={bookHubDaysEngagedLabel}
                savedWordsPerPageLabel={bookHubSavedWordsPerPageLabel}
                averageMinutesPerPageLabel={bookHubAverageMinutesPerPageLabel}
              />

              <BookHubActionPrompt />

              <BookHubNotices
                error={error}
                hideError={isEditingBookInfoPeople}
                saveNotice={saveNotice}
                saveNoticeTone={saveNoticeTone}
              />
              <BookHubActionGrid
                canUseCuriosityReading={canUseCuriosityReading}
                canUseSavedWordReading={canUseSavedWordReading}
                canUseStudyFlashcards={canUseStudyFlashcards}
                canUseVocabularyList={canUseVocabularyList}
                onCuriosityReading={() => {
                  if (!confirmLeaveIfTimerActive()) return;
                  router.push(`/books/${row.id}/curiosity-reading`);
                }}
                onFluidReadingExtensive={() => {
                  if (!confirmLeaveIfTimerActive()) return;
                  router.push(`/books/${row.id}/readalong`);
                }}
                onFluidReadingJustReading={() => {
                  if (!confirmLeaveIfTimerActive()) return;
                  router.push(`/books/${row.id}/just-reading`);
                }}
                onListening={() => {
                  if (!confirmLeaveIfTimerActive()) return;
                  router.push(`/books/${row.id}/listening`);
                }}
                onStudyFlashcards={() => {
                  if (!confirmLeaveIfTimerActive()) return;
                  router.push(`/books/${row.id}/study`);
                }}
                onVocabularyList={() => {
                  if (!confirmLeaveIfTimerActive()) return;
                  router.push(`/books/${row.id}/words`);
                }}
              />

              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-center">
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBookFlagNote("");
                      setShowBookFlagModal(true);
                    }}
                    className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                  >
                    Flag a problem
                  </button>

                  {canRemoveFromMyLibrary ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (!confirmLeaveIfTimerActive()) return;
                        setRemoveLibraryError(null);
                        setShowRemoveLibraryConfirm(true);
                      }}
                      className="rounded-full border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                    >
                      Remove from My Mekuru Library
                    </button>
                  ) : null}
                </div>
              </div>

              <BookHubTabBar activeTab={activeTab} onTabChange={setActiveTab} />

              {activeTab === "bookInfo" && (
                <div className="space-y-4">
                  <BookInfoTab
                    userBookId={row.id}
                    book={book}
                    canEditBookInfo={canEditBookInfo}
                    isEditingBookInfo={isEditingBookInfoDetails}
                    isEditingPeople={isEditingBookInfoPeople}
                    isEditingLinks={isEditingBookInfoLinks}
                    isEditingMyCopy={isEditingBookInfoCopy}
                    saving={saving}
                    errorMessage={isEditingBookInfoPeople ? error : null}
                    onEditBookInfo={() => {
                      if (!canEditBookInfo) return;
                      setEditingTab("bookInfoDetails");
                    }}
                    onEditPeople={() => {
                      if (!canEditBookInfo) return;
                      setEditingTab("bookInfoPeople");
                    }}
                    onEditLinks={() => {
                      if (!canEditBookInfo) return;
                      setEditingTab("bookInfoLinks");
                    }}
                    onEditMyCopy={() => {
                      if (!canEditBookInfo) return;
                      setEditingTab("bookInfoCopy");
                    }}
                    onCancel={cancelEdits}
                    onSave={saveAll}
                    sharedGenres={sharedGenres}
                    sharedContentNotes={sharedContentNotes}
                    genreLabel={genreLabel}
                    titleReading={titleReading}
                    setTitleReading={setTitleReading}
                    bookType={bookType}
                    setBookType={setBookType}
                    editionFormat={editionFormat}
                    setEditionFormat={setEditionFormat}
                    editionNote={editionNote}
                    setEditionNote={setEditionNote}
                    publishedDate={publishedDate}
                    setPublishedDate={setPublishedDate}
                    pageCount={pageCount}
                    setPageCount={setPageCount}
                    seriesNumber={seriesNumber}
                    setSeriesNumber={setSeriesNumber}
                    seriesTotal={seriesTotal}
                    setSeriesTotal={setSeriesTotal}
                    isbn={isbn}
                    setIsbn={setIsbn}
                    isbn13={isbn13}
                    setIsbn13={setIsbn13}
                    authorName={authorName}
                    authorEnglishName={authorEnglishName}
                    setAuthorEnglishName={setAuthorEnglishName}
                    setAuthorName={setAuthorName}
                    translatorName={translatorName}
                    translatorEnglishName={translatorEnglishName}
                    setTranslatorEnglishName={setTranslatorEnglishName}
                    setTranslatorName={setTranslatorName}
                    illustratorName={illustratorName}
                    illustratorEnglishName={illustratorEnglishName}
                    setIllustratorEnglishName={setIllustratorEnglishName}
                    setIllustratorName={setIllustratorName}
                    publisherName={publisherName}
                    setPublisherName={setPublisherName}
                    publisherReading={publisherReading}
                    setPublisherReading={setPublisherReading}
                    publisherEnglishName={publisherEnglishName}
                    setPublisherEnglishName={setPublisherEnglishName}
                    selectedPublisherId={selectedPublisherId}
                    setSelectedPublisherId={setSelectedPublisherId}
                    requireSharedPublisherRecord={requireSharedPublisherRecord}
                    setRequireSharedPublisherRecord={setRequireSharedPublisherRecord}
                    selectedAuthorId={selectedAuthorId}
                    setSelectedAuthorId={setSelectedAuthorId}
                    requireSharedAuthorRecord={requireSharedAuthorRecord}
                    setRequireSharedAuthorRecord={setRequireSharedAuthorRecord}
                    selectedTranslatorId={selectedTranslatorId}
                    setSelectedTranslatorId={setSelectedTranslatorId}
                    requireSharedTranslatorRecord={requireSharedTranslatorRecord}
                    setRequireSharedTranslatorRecord={setRequireSharedTranslatorRecord}
                    selectedIllustratorId={selectedIllustratorId}
                    setSelectedIllustratorId={setSelectedIllustratorId}
                    requireSharedIllustratorRecord={requireSharedIllustratorRecord}
                    setRequireSharedIllustratorRecord={setRequireSharedIllustratorRecord}
                    coverUrl={coverUrl}
                    setCoverUrl={setCoverUrl}
                    authorImg={authorImg}
                    setAuthorImg={setAuthorImg}
                    translatorImg={translatorImg}
                    setTranslatorImg={setTranslatorImg}
                    illustratorImg={illustratorImg}
                    setIllustratorImg={setIllustratorImg}
                    publisherImg={publisherImg}
                    setPublisherImg={setPublisherImg}
                    authorReading={authorReading}
                    setAuthorReading={setAuthorReading}
                    translatorReading={translatorReading}
                    setTranslatorReading={setTranslatorReading}
                    illustratorReading={illustratorReading}
                    setIllustratorReading={setIllustratorReading}
                    relatedLinksArr={relatedLinksArr}
                    linksText={linksText}
                    setLinksText={setLinksText}
                    bookTypeLabel={bookTypeLabel}
                    displayLinkLabel={displayLinkLabel}
                    displayLinkUrl={displayLinkUrl}
                    BOOK_TYPE_OPTIONS={BOOK_TYPE_OPTIONS}
                    Detail={Detail}
                    PersonRow={PersonRow}
                  />
                </div>
              )}

              {activeTab === "reading" && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                    <div className="mb-3 text-sm font-semibold text-stone-900">Add Words</div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <a
                        href={`/books/${encodeURIComponent(row.id)}/curiosity-reading`}
                        className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-center text-sm font-medium text-stone-800 shadow-sm transition hover:bg-stone-100 md:px-5 md:py-4 md:text-base"
                      >
                        Add from reading
                        <p className="mt-1 text-sm text-stone-500">
                          Use Curiosity Reading when you stop to look up and save words.
                        </p>
                      </a>

                      <a
                        href={`/books/${encodeURIComponent(row.id)}/listening`}
                        className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-center text-sm font-medium text-stone-800 shadow-sm transition hover:bg-stone-100 md:px-5 md:py-4 md:text-base"
                      >
                        Add from listening
                        <p className="mt-1 text-sm text-stone-500">
                          Use Listening when you stop to look up and save heard words.
                        </p>
                      </a>

                      <a
                        href={`/vocab/bulk?userBookId=${encodeURIComponent(row.id)}`}
                        className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-center text-sm font-medium text-stone-800 shadow-sm transition hover:bg-stone-100 md:px-5 md:py-4 md:text-base"
                      >
                        Bulk Add
                        <p className="mt-1 text-sm text-stone-500">
                          Add several words to this book at once.
                        </p>
                      </a>
                    </div>
                  </div>
                  <ReadingTab
                    row={row}
                    book={book}
                    isEditingThisTab={isEditingThisTab}
                    formatType={formatType}
                    setFormatType={setFormatType}
                    progressMode={progressMode}
                    setProgressMode={setProgressMode}
                    showPageNumbers={showPageNumbers}
                    setShowPageNumbers={setShowPageNumbers}
                    startedAt={startedAt}
                    setStartedAt={setStartedAt}
                    finishedAt={finishedAt}
                    setFinishedAt={setFinishedAt}
                    dnfAt={dnfAt}
                    setDnfAt={setDnfAt}
                    dnfReason={dnfReason}
                    setDnfReason={setDnfReason}
                    dnfNote={dnfNote}
                    setDnfNote={setDnfNote}
                    wouldRetry={wouldRetry}
                    setWouldRetry={setWouldRetry}
                    started={started}
                    finished={finished}
                    sessionDate={sessionDate}
                    setSessionDate={setSessionDate}
                    sessionMinutesRead={sessionMinutesRead}
                    setSessionMinutesRead={setSessionMinutesRead}
                    sessionMode={sessionMode}
                    setSessionMode={setSessionMode}
                    sessionStartPage={sessionStartPage}
                    setSessionStartPage={setSessionStartPage}
                    sessionEndPage={sessionEndPage}
                    setSessionEndPage={setSessionEndPage}
                    saveReadingSession={saveReadingSession}
                    saveReadingDates={saveReadingDates}
                    deleteReadingSession={deleteReadingSession}
                    editingReadingSessionId={editingReadingSessionId}
                    startEditingReadingSession={startEditingReadingSession}
                    cancelEditingReadingSession={cancelEditingReadingSession}
                    canFillBeginningPages={canFillBeginningPages}
                    fillBeginningPages={fillBeginningPages}
                    readingSessions={readingSessions}
                    visibleReadingSessions={visibleReadingSessions}
                    showAllSessions={showAllSessions}
                    renderSessionToggle={renderSessionToggle}
                    formatTypeLabel={formatTypeLabel}
                    progressModeLabel={progressModeLabel}
                    DateField={DateField}
                  />
                </div>
              )}

              {activeTab === "story" && (
                <div className="space-y-4">
                  {canUseStoryNotes ? (
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
                  ) : (
                    <FullAccessBookHubTabPanel
                      feature="story_notes"
                      title="Story Notes are a full-access tool"
                      message="Full access unlocks private character notes, plot notes, setting notes, and cultural notes for this book."
                    />
                  )}
                </div>
              )}

              {activeTab === "reflection" && (
                <div id="reading-reflection-panel" className="space-y-4 scroll-mt-6">
                  <RatingTab
                    row={row}
                    onSaveReflection={saveReadingReflectionFields}
                    saving={saving}
                    isEditingReflection={isEditingReflection}
                    onEditReflection={() => setEditingTab("reflection")}
                    onCancel={cancelEdits}
                    myReview={myReview}
                    setMyReview={setMyReview}
                    readerAdvice={readerAdvice}
                    setReaderAdvice={setReaderAdvice}
                    ratingOverall={ratingOverall}
                    setRatingOverall={setRatingOverall}
                    profileLevel={profileLevel}
                    bookType={book?.book_type ?? null}
                    ratingDifficulty={ratingDifficulty}
                    setRatingDifficulty={setRatingDifficulty}
                    favoriteQuotes={favoriteQuotes}
                    setFavoriteQuotes={setFavoriteQuotes}
                    memorableWords={memorableWords}
                    setMemorableWords={setMemorableWords}
                    genre={genre}
                    setGenre={setGenre}
                    triggerWarnings={triggerWarnings}
                    setTriggerWarnings={setTriggerWarnings}
                    sharedGenres={sharedGenres}
                    sharedContentNotes={sharedContentNotes}
                    genreLabel={genreLabel}
                    GENRE_OPTIONS={GENRE_OPTIONS}
                    StarRatingField={StarRatingField}
                    DifficultyField={DifficultyField}
                  />
                </div>
              )}
            </div>

            {showWordExplorer ? (
              <WordExplorerModal
                query={wordExplorerQuery}
                loading={wordExplorerLoading}
                error={wordExplorerError}
                results={wordExplorerResults}
                onQueryChange={setWordExplorerQuery}
                onSearch={searchWordExplorer}
                onClose={() => setShowWordExplorer(false)}
              />
            ) : null}
          </div>
        </section>
      </div >
    </main >
  );
}
