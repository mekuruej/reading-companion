// Book Info Tab
// 

"use client";

import { useEffect, useState, type ComponentType } from "react";
import { supabase } from "@/lib/supabaseClient";

type Book = {
  id: string;
  title: string;
  title_reading: string | null;
  author: string | null;
  translator: string | null;
  illustrator: string | null;
  publisher_id?: string | null;
  cover_url: string | null;
  genre: string | null;
  book_type: string | null;
  trigger_warnings: string | null;
  page_count: number | null;
  series_number: number | null;
  isbn: string | null;
  isbn13: string | null;
  publisher: string | null;
  published_date: string | null;
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

type Option = {
  value: string;
  label: string;
};

type PublisherRecord = {
  id: string;
  name_ja: string;
  name_en: string | null;
  reading: string | null;
  logo_url: string | null;
  normalized_name: string;
};

type PersonRecord = {
  id: string;
  name_ja: string;
  name_en: string | null;
  reading: string | null;
  image_url: string | null;
  normalized_name: string;
};

type BookAuthorRecord = {
  id: string;
  author: string | null;
  author_reading: string | null;
  author_image_url: string | null;
};

type ContributorAuthorRecord = {
  book_id: string;
  people: PersonRecord | PersonRecord[] | null;
};

type BookInfoTabProps = {
  book: Book;
  isEditingBookInfo: boolean;
  isEditingPeople: boolean;
  isEditingLinks: boolean;
  isEditingMyCopy: boolean;
  saving: boolean;
  errorMessage: string | null;
  onEditBookInfo: () => void;
  onEditPeople: () => void;
  onEditLinks: () => void;
  onEditMyCopy: () => void;
  onCancel: () => void;
  onSave: () => void;

  bookType: string;
  setBookType: (value: string) => void;
  publishedDate: string;
  setPublishedDate: (value: string) => void;
  pageCount: string;
  setPageCount: (value: string) => void;
  seriesNumber: string;
  setSeriesNumber: (value: string) => void;
  isbn: string;
  setIsbn: (value: string) => void;
  isbn13: string;
  setIsbn13: (value: string) => void;

  authorName: string;
  authorEnglishName: string;
  setAuthorEnglishName: (value: string) => void;
  setAuthorName: (value: string) => void;
  translatorName: string;
  translatorEnglishName: string;
  setTranslatorEnglishName: (value: string) => void;
  setTranslatorName: (value: string) => void;
  illustratorName: string;
  illustratorEnglishName: string;
  setIllustratorEnglishName: (value: string) => void;
  setIllustratorName: (value: string) => void;

  publisherName: string;
  setPublisherName: (value: string) => void;
  publisherEnglishName: string;
  setPublisherEnglishName: (value: string) => void;
  publisherReading: string;
  setPublisherReading: (value: string) => void;

  selectedAuthorId: string | null;
  setSelectedAuthorId: (value: string | null) => void;
  requireSharedAuthorRecord: boolean;
  setRequireSharedAuthorRecord: (value: boolean) => void;
  selectedTranslatorId: string | null;
  setSelectedTranslatorId: (value: string | null) => void;
  requireSharedTranslatorRecord: boolean;
  setRequireSharedTranslatorRecord: (value: boolean) => void;
  selectedIllustratorId: string | null;
  setSelectedIllustratorId: (value: string | null) => void;
  requireSharedIllustratorRecord: boolean;
  setRequireSharedIllustratorRecord: (value: boolean) => void;
  selectedPublisherId: string | null;
  setSelectedPublisherId: (value: string | null) => void;
  requireSharedPublisherRecord: boolean;
  setRequireSharedPublisherRecord: (value: boolean) => void;

  coverUrl: string;
  setCoverUrl: (value: string) => void;
  authorImg: string;
  setAuthorImg: (value: string) => void;
  translatorImg: string;
  setTranslatorImg: (value: string) => void;
  illustratorImg: string;
  setIllustratorImg: (value: string) => void;
  publisherImg: string;
  setPublisherImg: (value: string) => void;

  authorReading: string;
  setAuthorReading: (value: string) => void;
  translatorReading: string;
  setTranslatorReading: (value: string) => void;
  illustratorReading: string;
  setIllustratorReading: (value: string) => void;

  formatType: string;
  setFormatType: (value: string) => void;
  progressMode: string;
  setProgressMode: (value: string) => void;
  showPageNumbers: boolean;
  setShowPageNumbers: (value: boolean) => void;

  relatedLinksArr: any[];
  linksText: string;
  setLinksText: (value: string) => void;

  bookTypeLabel: (value: string | null | undefined) => string;
  formatTypeLabel: (value: string | null | undefined) => string;
  progressModeLabel: (value: string | null | undefined) => string;
  displayLinkLabel: (value: any) => string;
  displayLinkUrl: (value: any) => string;

  BOOK_TYPE_OPTIONS: readonly Option[];

  Detail: ComponentType<{
    label: string;
    value: any;
    editing: boolean;
    inputValue: string;
    setInputValue: (v: string) => void;
    placeholder?: string;
  }>;

  PersonRow: ComponentType<{
    label: string;
    name: string | null | undefined;
    reading: string | null | undefined;
    img: string | null | undefined;
    editing: boolean;
    nameValue: string;
    setNameValue: (v: string) => void;
    englishNameValue: string;
    setEnglishNameValue: (v: string) => void;
    imgValue: string;
    setImgValue: (v: string) => void;
    readingValue: string;
    setReadingValue: (v: string) => void;
  }>;
};

export default function BookInfoTab({
  book,
  isEditingBookInfo,
  isEditingPeople,
  isEditingLinks,
  isEditingMyCopy,
  saving,
  errorMessage,
  onEditBookInfo,
  onEditPeople,
  onEditLinks,
  onEditMyCopy,
  onCancel,
  onSave,

  bookType,
  setBookType,
  publishedDate,
  setPublishedDate,
  pageCount,
  setPageCount,
  seriesNumber,
  setSeriesNumber,
  isbn,
  setIsbn,
  isbn13,
  setIsbn13,

  authorName,
  authorEnglishName,
  setAuthorEnglishName,
  setAuthorName,
  translatorName,
  translatorEnglishName,
  setTranslatorEnglishName,
  setTranslatorName,
  illustratorName,
  illustratorEnglishName,
  setIllustratorEnglishName,
  setIllustratorName,

  publisherName,
  setPublisherName,
  publisherEnglishName,
  setPublisherEnglishName,
  publisherReading,
  setPublisherReading,

  selectedAuthorId,
  setSelectedAuthorId,
  requireSharedAuthorRecord,
  setRequireSharedAuthorRecord,
  selectedTranslatorId,
  setSelectedTranslatorId,
  requireSharedTranslatorRecord,
  setRequireSharedTranslatorRecord,
  selectedIllustratorId,
  setSelectedIllustratorId,
  requireSharedIllustratorRecord,
  setRequireSharedIllustratorRecord,
  selectedPublisherId,
  setSelectedPublisherId,
  requireSharedPublisherRecord,
  setRequireSharedPublisherRecord,

  coverUrl,
  setCoverUrl,
  authorImg,
  setAuthorImg,
  translatorImg,
  setTranslatorImg,
  illustratorImg,
  setIllustratorImg,
  publisherImg,
  setPublisherImg,

  authorReading,
  setAuthorReading,
  translatorReading,
  setTranslatorReading,
  illustratorReading,
  setIllustratorReading,

  formatType,
  setFormatType,
  progressMode,
  setProgressMode,
  showPageNumbers,
  setShowPageNumbers,

  relatedLinksArr,
  linksText,
  setLinksText,

  bookTypeLabel,
  formatTypeLabel,
  progressModeLabel,
  displayLinkLabel,
  displayLinkUrl,

  BOOK_TYPE_OPTIONS,

  Detail,
  PersonRow,
}: BookInfoTabProps) {
  const [authorSearch, setAuthorSearch] = useState("");
  const [authorResults, setAuthorResults] = useState<PersonRecord[]>([]);
  const [authorContributorMatches, setAuthorContributorMatches] = useState<PersonRecord[]>([]);
  const [authorBookMatches, setAuthorBookMatches] = useState<BookAuthorRecord[]>([]);
  const [authorSearchLoading, setAuthorSearchLoading] = useState(false);
  const [authorSearchError, setAuthorSearchError] = useState<string | null>(null);
  const [translatorSearch, setTranslatorSearch] = useState("");
  const [translatorResults, setTranslatorResults] = useState<PersonRecord[]>([]);
  const [translatorSearchLoading, setTranslatorSearchLoading] = useState(false);
  const [translatorSearchError, setTranslatorSearchError] = useState<string | null>(null);
  const [illustratorSearch, setIllustratorSearch] = useState("");
  const [illustratorResults, setIllustratorResults] = useState<PersonRecord[]>([]);
  const [illustratorSearchLoading, setIllustratorSearchLoading] = useState(false);
  const [illustratorSearchError, setIllustratorSearchError] = useState<string | null>(null);

  const [publisherSearch, setPublisherSearch] = useState("");
  const [publisherResults, setPublisherResults] = useState<PublisherRecord[]>([]);
  const [publisherSearchLoading, setPublisherSearchLoading] = useState(false);
  const [publisherSearchError, setPublisherSearchError] = useState<string | null>(null);

  const LINK_FIELD_OPTIONS = [
    {
      label: "Amazon",
      placeholder: "https://www.amazon.co.jp/...",
    },
    {
      label: "BookWalker",
      placeholder: "https://bookwalker.jp/...",
    },
    {
      label: "Other",
      placeholder: "https://...",
    },
  ] as const;

  function parseLinkTextToMap(text: string) {
    const map = new Map<string, string>();

    text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        const parts = line.split("|").map((part) => part.trim());

        if (parts.length >= 2) {
          const label = parts[0];
          const url = parts.slice(1).join("|").trim();

          if (label && url) {
            map.set(label, url);
          }

          return;
        }

        if (parts[0]) {
          map.set("Other", parts[0]);
        }
      });

    return map;
  }

  function getLinkFieldValue(label: string) {
    return parseLinkTextToMap(linksText).get(label) ?? "";
  }

  function updateLinkField(label: string, value: string) {
    const nextMap = parseLinkTextToMap(linksText);
    const trimmedValue = value.trim();

    if (trimmedValue) {
      nextMap.set(label, trimmedValue);
    } else {
      nextMap.delete(label);
    }

    const nextText = LINK_FIELD_OPTIONS
      .map((option) => {
        const url = nextMap.get(option.label)?.trim();
        return url ? `${option.label} | ${url}` : "";
      })
      .filter(Boolean)
      .join("\n");

    setLinksText(nextText);
  }

  function normalizeSearchTerm(value: string) {
    return value.trim().replace(/\s+/g, " ").toLowerCase();
  }

  function ilikePattern(value: string) {
    return `%${value}%`;
  }

  function dedupeById<T extends { id: string }>(items: T[]) {
    const seen = new Set<string>();
    const out: T[] = [];

    for (const item of items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
    }

    return out;
  }

  async function searchPeopleRecords(term: string) {
    const cleaned = term.trim();
    const normalized = normalizeSearchTerm(cleaned);
    const selectClause = "id, name_ja, name_en, reading, image_url, normalized_name";

    const [jaRes, enRes, readingRes, normalizedRes] = await Promise.all([
      supabase.from("people").select(selectClause).ilike("name_ja", ilikePattern(cleaned)).limit(8),
      supabase.from("people").select(selectClause).ilike("name_en", ilikePattern(cleaned)).limit(8),
      supabase.from("people").select(selectClause).ilike("reading", ilikePattern(cleaned)).limit(8),
      supabase
        .from("people")
        .select(selectClause)
        .ilike("normalized_name", ilikePattern(normalized))
        .limit(8),
    ]);

    const error = jaRes.error ?? enRes.error ?? readingRes.error ?? normalizedRes.error;
    if (error) {
      return { data: [] as PersonRecord[], error };
    }

    const merged = dedupeById([
      ...((jaRes.data ?? []) as PersonRecord[]),
      ...((enRes.data ?? []) as PersonRecord[]),
      ...((readingRes.data ?? []) as PersonRecord[]),
      ...((normalizedRes.data ?? []) as PersonRecord[]),
    ])
      .sort((a, b) => a.name_ja.localeCompare(b.name_ja))
      .slice(0, 8);

    return { data: merged, error: null };
  }

  useEffect(() => {
    let cancelled = false;

    async function runAuthorSearch() {
      const cleaned = authorSearch.trim();
      const normalized = normalizeSearchTerm(cleaned);

      if (!isEditingPeople || !cleaned) {
        setAuthorResults([]);
        setAuthorContributorMatches([]);
        setAuthorBookMatches([]);
        setAuthorSearchError(null);
        return;
      }

      setAuthorSearchLoading(true);
      setAuthorSearchError(null);

      const selectClause = "id, name_ja, name_en, reading, image_url, normalized_name";

      const [jaRes, enRes, readingRes, normalizedRes] = await Promise.all([
        supabase
          .from("people")
          .select(selectClause)
          .ilike("name_ja", ilikePattern(cleaned))
          .limit(8),
        supabase
          .from("people")
          .select(selectClause)
          .ilike("name_en", ilikePattern(cleaned))
          .limit(8),
        supabase
          .from("people")
          .select(selectClause)
          .ilike("reading", ilikePattern(cleaned))
          .limit(8),
        supabase
          .from("people")
          .select(selectClause)
          .ilike("normalized_name", ilikePattern(normalized))
          .limit(8),
      ]);

      const contributorRes = await supabase
        .from("book_contributors")
        .select(
          "book_id, people!inner(id, name_ja, name_en, reading, image_url, normalized_name)"
        )
        .eq("role", "author")
        .limit(200);

      const bookAuthorRes = await supabase
        .from("books")
        .select("id, author, author_reading, author_image_url")
        .ilike("author", ilikePattern(cleaned))
        .limit(8);

      const error =
        jaRes.error ??
        enRes.error ??
        readingRes.error ??
        normalizedRes.error ??
        contributorRes.error ??
        bookAuthorRes.error;

      if (!cancelled) {
        if (error) {
          console.error("Error searching authors:", error);
          setAuthorResults([]);
          setAuthorContributorMatches([]);
          setAuthorBookMatches([]);
          setAuthorSearchError(error.message);
        } else {
          const merged = dedupeById([
            ...((jaRes.data ?? []) as PersonRecord[]),
            ...((enRes.data ?? []) as PersonRecord[]),
            ...((readingRes.data ?? []) as PersonRecord[]),
            ...((normalizedRes.data ?? []) as PersonRecord[]),
          ])
            .sort((a, b) => a.name_ja.localeCompare(b.name_ja))
            .slice(0, 8);

          setAuthorResults(merged);

          const contributorPeople = dedupeById(
            ((contributorRes.data ?? []) as ContributorAuthorRecord[])
              .flatMap((item) =>
                Array.isArray(item.people) ? item.people : item.people ? [item.people] : []
              )
              .filter(
                (person) =>
                  (
                    person.name_ja?.includes(cleaned) ||
                    (person.name_en ?? "").toLowerCase().includes(normalized) ||
                    (person.reading ?? "").includes(cleaned) ||
                    normalizeSearchTerm(person.normalized_name ?? "").includes(normalized)
                  ) &&
                  !merged.some((existing) => existing.id === person.id)
              )
          )
            .sort((a, b) => a.name_ja.localeCompare(b.name_ja))
            .slice(0, 8);

          setAuthorContributorMatches(contributorPeople);

          const bookMatches = dedupeById(
            ((bookAuthorRes.data ?? []) as BookAuthorRecord[]).filter(
              (item): item is BookAuthorRecord =>
                !!item.author &&
                !merged.some(
                  (person) => normalizeSearchTerm(person.name_ja) === normalizeSearchTerm(item.author ?? "")
                ) &&
                !contributorPeople.some(
                  (person) => normalizeSearchTerm(person.name_ja) === normalizeSearchTerm(item.author ?? "")
                )
            )
          )
            .sort((a, b) => (a.author ?? "").localeCompare(b.author ?? ""))
            .slice(0, 8);

          setAuthorBookMatches(bookMatches);
        }
        setAuthorSearchLoading(false);
      }
    }

    runAuthorSearch();

    return () => {
      cancelled = true;
    };
  }, [authorSearch, isEditingPeople]);

  useEffect(() => {
    let cancelled = false;

    async function runTranslatorSearch() {
      const cleaned = translatorSearch.trim();

      if (!isEditingPeople || !cleaned) {
        setTranslatorResults([]);
        setTranslatorSearchError(null);
        return;
      }

      setTranslatorSearchLoading(true);
      setTranslatorSearchError(null);

      const { data, error } = await searchPeopleRecords(cleaned);

      if (!cancelled) {
        if (error) {
          console.error("Error searching translators:", error);
          setTranslatorResults([]);
          setTranslatorSearchError(error.message);
        } else {
          setTranslatorResults(data);
        }
        setTranslatorSearchLoading(false);
      }
    }

    runTranslatorSearch();

    return () => {
      cancelled = true;
    };
  }, [translatorSearch, isEditingPeople]);

  useEffect(() => {
    let cancelled = false;

    async function runIllustratorSearch() {
      const cleaned = illustratorSearch.trim();

      if (!isEditingPeople || !cleaned) {
        setIllustratorResults([]);
        setIllustratorSearchError(null);
        return;
      }

      setIllustratorSearchLoading(true);
      setIllustratorSearchError(null);

      const { data, error } = await searchPeopleRecords(cleaned);

      if (!cancelled) {
        if (error) {
          console.error("Error searching illustrators:", error);
          setIllustratorResults([]);
          setIllustratorSearchError(error.message);
        } else {
          setIllustratorResults(data);
        }
        setIllustratorSearchLoading(false);
      }
    }

    runIllustratorSearch();

    return () => {
      cancelled = true;
    };
  }, [illustratorSearch, isEditingPeople]);

  useEffect(() => {
    let cancelled = false;

    async function runPublisherSearch() {
      const cleaned = publisherSearch.trim();
      const normalized = normalizeSearchTerm(cleaned);

      if (!isEditingPeople || !cleaned) {
        setPublisherResults([]);
        setPublisherSearchError(null);
        return;
      }

      setPublisherSearchLoading(true);
      setPublisherSearchError(null);

      const selectClause = "id, name_ja, name_en, reading, logo_url, normalized_name";

      const [jaRes, enRes, readingRes, normalizedRes] = await Promise.all([
        supabase
          .from("publishers")
          .select(selectClause)
          .ilike("name_ja", ilikePattern(cleaned))
          .limit(8),
        supabase
          .from("publishers")
          .select(selectClause)
          .ilike("name_en", ilikePattern(cleaned))
          .limit(8),
        supabase
          .from("publishers")
          .select(selectClause)
          .ilike("reading", ilikePattern(cleaned))
          .limit(8),
        supabase
          .from("publishers")
          .select(selectClause)
          .ilike("normalized_name", ilikePattern(normalized))
          .limit(8),
      ]);

      const error =
        jaRes.error ?? enRes.error ?? readingRes.error ?? normalizedRes.error;

      if (!cancelled) {
        if (error) {
          console.error("Error searching publishers:", error);
          setPublisherResults([]);
          setPublisherSearchError(error.message);
        } else {
          const merged = dedupeById([
            ...((jaRes.data ?? []) as PublisherRecord[]),
            ...((enRes.data ?? []) as PublisherRecord[]),
            ...((readingRes.data ?? []) as PublisherRecord[]),
            ...((normalizedRes.data ?? []) as PublisherRecord[]),
          ])
            .sort((a, b) => a.name_ja.localeCompare(b.name_ja))
            .slice(0, 8);

          setPublisherResults(merged);
        }
        setPublisherSearchLoading(false);
      }
    }

    runPublisherSearch();

    return () => {
      cancelled = true;
    };
  }, [publisherSearch, isEditingPeople]);

  function handleSelectAuthor(person: PersonRecord) {
    setSelectedAuthorId(person.id);
    setRequireSharedAuthorRecord(false);
    setAuthorSearch(person.name_ja);
    setAuthorName(person.name_ja);
    setAuthorEnglishName(person.name_en ?? "");
    setAuthorReading(person.reading ?? "");
    setAuthorImg(person.image_url ?? "");
    setAuthorResults([]);
  }

  function clearSelectedAuthor() {
    setSelectedAuthorId(null);
    setRequireSharedAuthorRecord(false);
    setAuthorSearch("");
    setAuthorSearchError(null);
  }

  function handleUseBookAuthorMatch(match: BookAuthorRecord) {
    setSelectedAuthorId(null);
    setRequireSharedAuthorRecord(false);
    setAuthorSearch(match.author ?? "");
    setAuthorName(match.author ?? "");
    setAuthorEnglishName("");
    setAuthorReading(match.author_reading ?? "");
    setAuthorImg(match.author_image_url ?? "");
    setAuthorResults([]);
    setAuthorContributorMatches([]);
    setAuthorBookMatches([]);
    setAuthorSearchError(null);
  }

  function handleSelectTranslator(person: PersonRecord) {
    setSelectedTranslatorId(person.id);
    setRequireSharedTranslatorRecord(false);
    setTranslatorSearch(person.name_ja);
    setTranslatorName(person.name_ja);
    setTranslatorEnglishName(person.name_en ?? "");
    setTranslatorReading(person.reading ?? "");
    setTranslatorImg(person.image_url ?? "");
    setTranslatorResults([]);
  }

  function clearSelectedTranslator() {
    setSelectedTranslatorId(null);
    setRequireSharedTranslatorRecord(false);
    setTranslatorSearch("");
    setTranslatorSearchError(null);
  }

  function handleSelectIllustrator(person: PersonRecord) {
    setSelectedIllustratorId(person.id);
    setRequireSharedIllustratorRecord(false);
    setIllustratorSearch(person.name_ja);
    setIllustratorName(person.name_ja);
    setIllustratorEnglishName(person.name_en ?? "");
    setIllustratorReading(person.reading ?? "");
    setIllustratorImg(person.image_url ?? "");
    setIllustratorResults([]);
  }

  function clearSelectedIllustrator() {
    setSelectedIllustratorId(null);
    setRequireSharedIllustratorRecord(false);
    setIllustratorSearch("");
    setIllustratorSearchError(null);
  }

  function handleSelectPublisher(publisher: PublisherRecord) {
    setSelectedPublisherId(publisher.id);
    setRequireSharedPublisherRecord(false);
    setPublisherSearch(publisher.name_ja);
    setPublisherName(publisher.name_ja);
    setPublisherEnglishName(publisher.name_en ?? "");
    setPublisherReading(publisher.reading ?? "");
    setPublisherImg(publisher.logo_url ?? "");
    setPublisherResults([]);
  }

  function clearSelectedPublisher() {
    setSelectedPublisherId(null);
    setRequireSharedPublisherRecord(false);
    setPublisherSearch("");
    setPublisherSearchError(null);
  }

  function startNewAuthorFromSearch() {
    const cleaned = authorSearch.trim();
    if (!cleaned) return;
    setSelectedAuthorId(null);
    setRequireSharedAuthorRecord(true);
    setAuthorName(cleaned);
    setAuthorSearchError(null);
    setAuthorResults([]);
    setAuthorContributorMatches([]);
    setAuthorBookMatches([]);
  }

  function startNewTranslatorFromSearch() {
    const cleaned = translatorSearch.trim();
    if (!cleaned) return;
    setSelectedTranslatorId(null);
    setRequireSharedTranslatorRecord(true);
    setTranslatorName(cleaned);
    setTranslatorSearchError(null);
    setTranslatorResults([]);
  }

  function startNewIllustratorFromSearch() {
    const cleaned = illustratorSearch.trim();
    if (!cleaned) return;
    setSelectedIllustratorId(null);
    setRequireSharedIllustratorRecord(true);
    setIllustratorName(cleaned);
    setIllustratorSearchError(null);
    setIllustratorResults([]);
  }

  function startNewPublisherFromSearch() {
    const cleaned = publisherSearch.trim();
    if (!cleaned) return;
    setSelectedPublisherId(null);
    setRequireSharedPublisherRecord(true);
    setPublisherName(cleaned);
    setPublisherSearchError(null);
    setPublisherResults([]);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-stone-900">My Copy</div>
          {!isEditingMyCopy ? (
            <button
              type="button"
              onClick={onEditMyCopy}
              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-700 transition hover:bg-stone-100"
            >
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-lg bg-stone-200 px-3 py-1.5 text-sm text-stone-900 transition hover:bg-stone-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded border bg-white p-3 text-sm">
            <div className="text-stone-600">Format</div>
            {!isEditingMyCopy ? (
              <div className="mt-1 font-medium">{formatTypeLabel(formatType)}</div>
            ) : (
              <select
                value={formatType}
                onChange={(e) => setFormatType(e.target.value)}
                className="mt-1 w-full rounded border bg-white px-2 py-1 text-sm"
              >
                <option value="">—</option>
                <option value="paperback">Paperback</option>
                <option value="hardcover">Hardcover</option>
                <option value="ebook">eBook</option>
                <option value="audiobook">Audiobook</option>
                <option value="other">Other</option>
              </select>
            )}
          </div>

          <div className="rounded border bg-white p-3 text-sm">
            <div className="text-stone-600">Progress Mode</div>
            {!isEditingMyCopy ? (
              <div className="mt-1 font-medium">{progressModeLabel(progressMode)}</div>
            ) : (
              <select
                value={progressMode}
                onChange={(e) => setProgressMode(e.target.value)}
                className="mt-1 w-full rounded border bg-white px-2 py-1 text-sm"
              >
                <option value="">—</option>
                <option value="pages">Pages</option>
                <option value="percent">Percent</option>
                <option value="chapters">Chapters</option>
                <option value="time">Time</option>
              </select>
            )}
          </div>

          <div className="rounded border bg-white p-3 text-sm">
            <div className="text-stone-600">Use page numbers in this book</div>
            {!isEditingMyCopy ? (
              <div className="mt-1 font-medium">{showPageNumbers ? "Yes" : "No"}</div>
            ) : (
              <label className="mt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showPageNumbers}
                  onChange={(e) => setShowPageNumbers(e.target.checked)}
                />
                <span>Show page numbers</span>
              </label>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
              <span>These book details are managed by the site.</span>
              <span className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-3 py-1 font-medium text-stone-700">
                <span>Request a different edition</span>
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600">
                  Coming Soon
                </span>
              </span>
            </div>
            <div className="mt-2 text-sm font-semibold text-stone-900">
              Book Info
            </div>
          </div>
          {!isEditingBookInfo ? (
            <button
              type="button"
              onClick={onEditBookInfo}
              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-700 transition hover:bg-stone-100"
            >
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-lg bg-stone-200 px-3 py-1.5 text-sm text-stone-900 transition hover:bg-stone-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div className="rounded border bg-white p-3 text-sm">
            <div className="text-stone-600">Book Type</div>
            {!isEditingBookInfo ? (
              <div className="font-medium">{bookTypeLabel(book.book_type)}</div>
            ) : (
              <select
                value={bookType}
                onChange={(e) => setBookType(e.target.value)}
                className="mt-1 w-full rounded border bg-white px-2 py-1 text-sm"
              >
                <option value="">—</option>
                {BOOK_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          <Detail
            label="Published"
            value={book.published_date}
            editing={isEditingBookInfo}
            inputValue={publishedDate}
            setInputValue={setPublishedDate}
            placeholder="e.g. 2005"
          />

          <Detail
            label="Page Count"
            value={book.page_count}
            editing={isEditingBookInfo}
            inputValue={pageCount}
            setInputValue={setPageCount}
            placeholder="e.g. 352"
          />

          <Detail
            label="Series Number"
            value={book.series_number}
            editing={isEditingBookInfo}
            inputValue={seriesNumber}
            setInputValue={setSeriesNumber}
            placeholder="e.g. 2"
          />

          <Detail
            label="ISBN"
            value={book.isbn}
            editing={isEditingBookInfo}
            inputValue={isbn}
            setInputValue={setIsbn}
            placeholder="ISBN"
          />

          <Detail
            label="ISBN-13"
            value={book.isbn13}
            editing={isEditingBookInfo}
            inputValue={isbn13}
            setInputValue={setIsbn13}
            placeholder="ISBN-13"
          />
        </div>

        {isEditingBookInfo ? (
          <div className="mt-4 rounded border bg-white p-3 text-sm">
            <div className="text-stone-600">Cover URL</div>
            <input
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="Cover URL"
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
            />
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-stone-900">People</div>
          {!isEditingPeople ? (
            <button
              type="button"
              onClick={onEditPeople}
              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-700 transition hover:bg-stone-100"
            >
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-lg bg-stone-200 px-3 py-1.5 text-sm text-stone-900 transition hover:bg-stone-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          )}
        </div>

        {errorMessage ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="space-y-4">
          <div className="space-y-2">
            {isEditingPeople ? (
              <div className="rounded border bg-white p-3 text-sm">
                <label className="mb-1 block text-sm font-medium text-stone-700">
                  Search existing author
                </label>
                <input
                  value={authorSearch}
                  onChange={(e) => {
                    setAuthorSearch(e.target.value);
                    setSelectedAuthorId(null);
                    setAuthorSearchError(null);
                  }}
                  placeholder="宮沢 賢治 / Kenji Miyazawa / みやざわ けんじ"
                  className="w-full rounded border px-2 py-1 text-sm"
                />
                <div className="mt-2 text-xs text-stone-500">
                  Pick an existing author when you can. If no match exists, keep the author typed
                  in below and save. The app will try to create a shared author record
                  automatically.
                </div>

                {authorSearchLoading ? (
                  <div className="mt-2 text-xs text-stone-500">Searching…</div>
                ) : null}

                {authorSearchError ? (
                  <div className="mt-2 text-xs text-red-600">{authorSearchError}</div>
                ) : null}

                {authorResults.length > 0 ? (
                  <div className="mt-2 rounded border border-stone-200">
                    {authorResults.map((person) => (
                      <button
                        key={person.id}
                        type="button"
                        onClick={() => handleSelectAuthor(person)}
                        className="block w-full border-b border-stone-200 px-3 py-2 text-left last:border-b-0 hover:bg-stone-50"
                      >
                        <div className="font-medium text-stone-900">{person.name_ja}</div>
                        <div className="text-xs text-stone-600">
                          {person.name_en || "—"} · {person.reading || "—"}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : authorSearch.trim() && !authorSearchLoading && !authorSearchError ? (
                  <div className="mt-2 text-xs text-stone-500">
                    No matching author found in saved people records yet.
                  </div>
                ) : null}

                {authorContributorMatches.length > 0 ? (
                  <div className="mt-2 rounded border border-blue-200 bg-blue-50">
                    <div className="border-b border-blue-200 px-3 py-2 text-xs font-medium text-blue-800">
                      Found through existing author links
                    </div>
                    {authorContributorMatches.map((person) => (
                      <button
                        key={person.id}
                        type="button"
                        onClick={() => handleSelectAuthor(person)}
                        className="block w-full border-b border-blue-200 px-3 py-2 text-left last:border-b-0 hover:bg-blue-100"
                      >
                        <div className="font-medium text-stone-900">{person.name_ja}</div>
                        <div className="text-xs text-stone-600">
                          {person.name_en || "—"} · {person.reading || "—"}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null}

                {authorBookMatches.length > 0 ? (
                  <div className="mt-2 rounded border border-emerald-200 bg-emerald-50">
                    <div className="border-b border-emerald-200 px-3 py-2 text-xs font-medium text-emerald-800">
                      Found in existing book records
                    </div>
                    {authorBookMatches.map((match) => (
                      <button
                        key={match.id}
                        type="button"
                        onClick={() => handleUseBookAuthorMatch(match)}
                        className="block w-full border-b border-emerald-200 px-3 py-2 text-left last:border-b-0 hover:bg-emerald-100"
                      >
                        <div className="font-medium text-stone-900">{match.author}</div>
                        <div className="text-xs text-stone-600">
                          {match.author_reading || "—"}
                        </div>
                      </button>
                    ))}
                    <div className="px-3 py-2 text-xs text-emerald-800">
                      Selecting one will fill the author fields here, and saving will create or link the person record.
                    </div>
                  </div>
                ) : null}

                {selectedAuthorId ? (
                  <div className="mt-2 flex items-center gap-2 text-xs text-stone-600">
                    <span className="rounded-full bg-stone-100 px-2 py-1">
                      Linked to person record
                    </span>
                    <button
                      type="button"
                      onClick={clearSelectedAuthor}
                      className="text-stone-500 underline hover:text-stone-700"
                    >
                      Clear selection
                    </button>
                  </div>
                ) : null}

                {requireSharedAuthorRecord ? (
                  <div className="mt-2 text-xs font-medium text-amber-700">
                    New shared author record will be required on save.
                  </div>
                ) : null}

                {authorSearch.trim() ? (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <div className="text-xs text-amber-900">
                      Don&apos;t see the right match? Create a new shared author record from this
                      search, then finish the details below.
                    </div>
                    <button
                      type="button"
                      onClick={startNewAuthorFromSearch}
                      className="mt-2 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm text-amber-900 transition hover:bg-amber-100"
                    >
                      Create New Author
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            <PersonRow
              label="Author"
              name={isEditingPeople ? authorName : book.author}
              reading={isEditingPeople ? authorReading : book.author_reading}
              img={isEditingPeople ? authorImg : book.author_image_url}
              editing={isEditingPeople}
              nameValue={authorName}
              setNameValue={(value) => {
                setAuthorName(value);
                setSelectedAuthorId(null);
              }}
              englishNameValue={authorEnglishName}
              setEnglishNameValue={(value) => {
                setAuthorEnglishName(value);
                setSelectedAuthorId(null);
              }}
              imgValue={authorImg}
              setImgValue={setAuthorImg}
              readingValue={authorReading}
              setReadingValue={setAuthorReading}
            />
          </div>

          {(book.translator || book.translator_image_url || isEditingPeople) && (
            <div className="space-y-2">
              {isEditingPeople ? (
                <div className="rounded border bg-white p-3 text-sm">
                  <label className="mb-1 block text-sm font-medium text-stone-700">
                    Search existing translator
                  </label>
                  <input
                    value={translatorSearch}
                    onChange={(e) => {
                      setTranslatorSearch(e.target.value);
                      setSelectedTranslatorId(null);
                      setTranslatorSearchError(null);
                    }}
                    placeholder="村上 春樹 / Haruki Murakami / むらかみ はるき"
                    className="w-full rounded border px-2 py-1 text-sm"
                  />

                  {translatorSearchLoading ? (
                    <div className="mt-2 text-xs text-stone-500">Searching…</div>
                  ) : null}

                  {translatorSearchError ? (
                    <div className="mt-2 text-xs text-red-600">{translatorSearchError}</div>
                  ) : null}

                  {translatorResults.length > 0 ? (
                    <div className="mt-2 rounded border border-stone-200">
                      {translatorResults.map((person) => (
                        <button
                          key={person.id}
                          type="button"
                          onClick={() => handleSelectTranslator(person)}
                          className="block w-full border-b border-stone-200 px-3 py-2 text-left last:border-b-0 hover:bg-stone-50"
                        >
                          <div className="font-medium text-stone-900">{person.name_ja}</div>
                          <div className="text-xs text-stone-600">
                            {person.name_en || "—"} · {person.reading || "—"}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : translatorSearch.trim() && !translatorSearchLoading && !translatorSearchError ? (
                    <div className="mt-2 text-xs text-stone-500">
                      No matching translator found in saved people records yet.
                    </div>
                  ) : null}

                  {selectedTranslatorId ? (
                    <div className="mt-2 flex items-center gap-2 text-xs text-stone-600">
                      <span className="rounded-full bg-stone-100 px-2 py-1">
                        Linked to person record
                      </span>
                      <button
                        type="button"
                        onClick={clearSelectedTranslator}
                        className="text-stone-500 underline hover:text-stone-700"
                      >
                        Clear selection
                      </button>
                    </div>
                  ) : null}

                  {requireSharedTranslatorRecord ? (
                    <div className="mt-2 text-xs font-medium text-amber-700">
                      New shared translator record will be required on save.
                    </div>
                  ) : null}

                  {translatorSearch.trim() ? (
                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <div className="text-xs text-amber-900">
                        Don&apos;t see the right match? Create a new shared translator record from
                        this search, then finish the details below.
                      </div>
                      <button
                        type="button"
                        onClick={startNewTranslatorFromSearch}
                        className="mt-2 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm text-amber-900 transition hover:bg-amber-100"
                      >
                        Create New Translator
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <PersonRow
                label="Translator"
                name={isEditingPeople ? translatorName : book.translator}
                reading={isEditingPeople ? translatorReading : book.translator_reading}
                img={isEditingPeople ? translatorImg : book.translator_image_url}
                editing={isEditingPeople}
                nameValue={translatorName}
                setNameValue={(value) => {
                  setTranslatorName(value);
                  setSelectedTranslatorId(null);
                }}
                englishNameValue={translatorEnglishName}
                setEnglishNameValue={(value) => {
                  setTranslatorEnglishName(value);
                  setSelectedTranslatorId(null);
                }}
                imgValue={translatorImg}
                setImgValue={setTranslatorImg}
                readingValue={translatorReading}
                setReadingValue={setTranslatorReading}
              />
            </div>
          )}

          {(book.illustrator || book.illustrator_image_url || isEditingPeople) && (
            <div className="space-y-2">
              {isEditingPeople ? (
                <div className="rounded border bg-white p-3 text-sm">
                  <label className="mb-1 block text-sm font-medium text-stone-700">
                    Search existing illustrator
                  </label>
                  <input
                    value={illustratorSearch}
                    onChange={(e) => {
                      setIllustratorSearch(e.target.value);
                      setSelectedIllustratorId(null);
                      setIllustratorSearchError(null);
                    }}
                    placeholder="安野 光雅 / Mitsumasa Anno / あんの みつまさ"
                    className="w-full rounded border px-2 py-1 text-sm"
                  />

                  {illustratorSearchLoading ? (
                    <div className="mt-2 text-xs text-stone-500">Searching…</div>
                  ) : null}

                  {illustratorSearchError ? (
                    <div className="mt-2 text-xs text-red-600">{illustratorSearchError}</div>
                  ) : null}

                  {illustratorResults.length > 0 ? (
                    <div className="mt-2 rounded border border-stone-200">
                      {illustratorResults.map((person) => (
                        <button
                          key={person.id}
                          type="button"
                          onClick={() => handleSelectIllustrator(person)}
                          className="block w-full border-b border-stone-200 px-3 py-2 text-left last:border-b-0 hover:bg-stone-50"
                        >
                          <div className="font-medium text-stone-900">{person.name_ja}</div>
                          <div className="text-xs text-stone-600">
                            {person.name_en || "—"} · {person.reading || "—"}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : illustratorSearch.trim() && !illustratorSearchLoading && !illustratorSearchError ? (
                    <div className="mt-2 text-xs text-stone-500">
                      No matching illustrator found in saved people records yet.
                    </div>
                  ) : null}

                  {selectedIllustratorId ? (
                    <div className="mt-2 flex items-center gap-2 text-xs text-stone-600">
                      <span className="rounded-full bg-stone-100 px-2 py-1">
                        Linked to person record
                      </span>
                      <button
                        type="button"
                        onClick={clearSelectedIllustrator}
                        className="text-stone-500 underline hover:text-stone-700"
                      >
                        Clear selection
                      </button>
                    </div>
                  ) : null}

                  {requireSharedIllustratorRecord ? (
                    <div className="mt-2 text-xs font-medium text-amber-700">
                      New shared illustrator record will be required on save.
                    </div>
                  ) : null}

                  {illustratorSearch.trim() ? (
                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <div className="text-xs text-amber-900">
                        Don&apos;t see the right match? Create a new shared illustrator record from
                        this search, then finish the details below.
                      </div>
                      <button
                        type="button"
                        onClick={startNewIllustratorFromSearch}
                        className="mt-2 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm text-amber-900 transition hover:bg-amber-100"
                      >
                        Create New Illustrator
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <PersonRow
                label="Illustrator"
                name={isEditingPeople ? illustratorName : book.illustrator}
                reading={isEditingPeople ? illustratorReading : book.illustrator_reading}
                img={isEditingPeople ? illustratorImg : book.illustrator_image_url}
                editing={isEditingPeople}
                nameValue={illustratorName}
                setNameValue={(value) => {
                  setIllustratorName(value);
                  setSelectedIllustratorId(null);
                }}
                englishNameValue={illustratorEnglishName}
                setEnglishNameValue={(value) => {
                  setIllustratorEnglishName(value);
                  setSelectedIllustratorId(null);
                }}
                imgValue={illustratorImg}
                setImgValue={setIllustratorImg}
                readingValue={illustratorReading}
                setReadingValue={setIllustratorReading}
              />
            </div>
          )}

          {(book.publisher || book.publisher_image_url || isEditingPeople) && (
            <div className="space-y-2">
              {isEditingPeople ? (
                <div className="rounded border bg-white p-3 text-sm">
                  <label className="mb-1 block text-sm font-medium text-stone-700">
                    Search existing publisher
                  </label>
                  <input
                    value={publisherSearch}
                    onChange={(e) => {
                      setPublisherSearch(e.target.value);
                      setSelectedPublisherId(null);
                      setPublisherSearchError(null);
                    }}
                    placeholder="講談社 / Kodansha / こうだんしゃ"
                    className="w-full rounded border px-2 py-1 text-sm"
                  />

                  {publisherSearchLoading ? (
                    <div className="mt-2 text-xs text-stone-500">Searching…</div>
                  ) : null}

                  {publisherSearchError ? (
                    <div className="mt-2 text-xs text-red-600">{publisherSearchError}</div>
                  ) : null}

                  {publisherResults.length > 0 ? (
                    <div className="mt-2 rounded border border-stone-200">
                      {publisherResults.map((publisher) => (
                        <button
                          key={publisher.id}
                          type="button"
                          onClick={() => handleSelectPublisher(publisher)}
                          className="block w-full border-b border-stone-200 px-3 py-2 text-left last:border-b-0 hover:bg-stone-50"
                        >
                          <div className="font-medium text-stone-900">
                            {publisher.name_ja}
                          </div>
                          <div className="text-xs text-stone-600">
                            {publisher.name_en || "—"} · {publisher.reading || "—"}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : publisherSearch.trim() && !publisherSearchLoading && !publisherSearchError ? (
                    <div className="mt-2 text-xs text-stone-500">No matching publisher found.</div>
                  ) : null}

                  {selectedPublisherId ? (
                    <div className="mt-2 flex items-center gap-2 text-xs text-stone-600">
                      <span className="rounded-full bg-stone-100 px-2 py-1">
                        Linked to publisher record
                      </span>
                      <button
                        type="button"
                        onClick={clearSelectedPublisher}
                        className="text-stone-500 underline hover:text-stone-700"
                      >
                        Clear selection
                      </button>
                    </div>
                  ) : null}

                  {requireSharedPublisherRecord ? (
                    <div className="mt-2 text-xs font-medium text-amber-700">
                      New shared publisher record will be required on save.
                    </div>
                  ) : null}

                  {publisherSearch.trim() ? (
                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <div className="text-xs text-amber-900">
                        Don&apos;t see the right match? Create a new shared publisher record from this
                        search, then finish the details below.
                      </div>
                      <button
                        type="button"
                        onClick={startNewPublisherFromSearch}
                        className="mt-2 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm text-amber-900 transition hover:bg-amber-100"
                      >
                        Create New Publisher
                      </button>
                    </div>
                  ) : null}

                  <div className="mt-3">
                    <label className="mb-1 block text-sm font-medium text-stone-700">
                      Publisher name (English)
                    </label>
                    <input
                      value={publisherEnglishName}
                      onChange={(e) => setPublisherEnglishName(e.target.value)}
                      placeholder="Kodansha"
                      className="w-full rounded border px-2 py-1 text-sm"
                    />
                  </div>
                </div>
              ) : null}

              <PersonRow
                label="Publisher"
                name={isEditingPeople ? publisherName : book.publisher}
                reading={isEditingPeople ? publisherReading : book.publisher_reading}
                img={isEditingPeople ? publisherImg : book.publisher_image_url}
                editing={isEditingPeople}
                nameValue={publisherName}
                setNameValue={(value) => {
                  setPublisherName(value);
                  setSelectedPublisherId(null);
                }}
                englishNameValue={publisherEnglishName}
                setEnglishNameValue={setPublisherEnglishName}
                imgValue={publisherImg}
                setImgValue={setPublisherImg}
                readingValue={publisherReading}
                setReadingValue={setPublisherReading}
              />
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-stone-900">Where to Find It</div>
          {!isEditingLinks ? (
            <button
              type="button"
              onClick={onEditLinks}
              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-700 transition hover:bg-stone-100"
            >
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-lg bg-stone-200 px-3 py-1.5 text-sm text-stone-900 transition hover:bg-stone-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          )}
        </div>

        {relatedLinksArr.length > 0 ? (
          <ul className="flex flex-wrap gap-2 text-sm">
            {relatedLinksArr.map((item: any, idx: number) => {
              const label = displayLinkLabel(item);
              const url = displayLinkUrl(item);

              return (
                <li key={idx}>
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center rounded-full border border-stone-300 bg-white px-3 py-1.5 font-medium text-stone-700 transition hover:bg-stone-100"
                    >
                      {label}
                    </a>
                  ) : (
                    <span className="text-stone-500">{label || "—"}</span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-sm text-stone-500">—</div>
        )}

        {isEditingLinks ? (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {LINK_FIELD_OPTIONS.map((option) => (
              <label key={option.label} className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-stone-500">
                  {option.label}
                </span>

                <input
                  value={getLinkFieldValue(option.label)}
                  onChange={(event) => updateLinkField(option.label, event.target.value)}
                  placeholder={option.placeholder}
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            ))}
          </div>
        ) : null}
      </div>

    </div>
  );
}
