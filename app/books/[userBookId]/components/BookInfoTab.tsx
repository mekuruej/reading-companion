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
  cover_url: string | null;
  genre: string | null;
  book_type: string | null;
  trigger_warnings: string | null;
  page_count: number | null;
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

type BookInfoTabProps = {
  book: Book;
  isEditing: boolean;

  genre: string;
  setGenre: (value: string) => void;
  bookType: string;
  setBookType: (value: string) => void;
  triggerWarnings: string;
  setTriggerWarnings: (value: string) => void;
  publishedDate: string;
  setPublishedDate: (value: string) => void;
  pageCount: string;
  setPageCount: (value: string) => void;
  isbn: string;
  setIsbn: (value: string) => void;
  isbn13: string;
  setIsbn13: (value: string) => void;

  authorName: string;
  setAuthorName: (value: string) => void;
  translatorName: string;
  setTranslatorName: (value: string) => void;
  illustratorName: string;
  setIllustratorName: (value: string) => void;

  publisherName: string;
  setPublisherName: (value: string) => void;
  publisherEnglishName: string;
  setPublisherEnglishName: (value: string) => void;
  publisherReading: string;
  setPublisherReading: (value: string) => void;

  selectedAuthorId: string | null;
  setSelectedAuthorId: (value: string | null) => void;
  selectedPublisherId: string | null;
  setSelectedPublisherId: (value: string | null) => void;

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

  genreLabel: (value: string | null | undefined) => string;
  bookTypeLabel: (value: string | null | undefined) => string;
  formatTypeLabel: (value: string | null | undefined) => string;
  progressModeLabel: (value: string | null | undefined) => string;
  displayLinkLabel: (value: any) => string;
  displayLinkUrl: (value: any) => string;

  GENRE_OPTIONS: readonly Option[];
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
    imgValue: string;
    setImgValue: (v: string) => void;
    readingValue: string;
    setReadingValue: (v: string) => void;
  }>;
};

export default function BookInfoTab({
  book,
  isEditing,

  genre,
  setGenre,
  bookType,
  setBookType,
  triggerWarnings,
  setTriggerWarnings,
  publishedDate,
  setPublishedDate,
  pageCount,
  setPageCount,
  isbn,
  setIsbn,
  isbn13,
  setIsbn13,

  authorName,
  setAuthorName,
  translatorName,
  setTranslatorName,
  illustratorName,
  setIllustratorName,

  publisherName,
  setPublisherName,
  publisherEnglishName,
  setPublisherEnglishName,
  publisherReading,
  setPublisherReading,

  selectedAuthorId,
  setSelectedAuthorId,
  selectedPublisherId,
  setSelectedPublisherId,

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

  genreLabel,
  bookTypeLabel,
  formatTypeLabel,
  progressModeLabel,
  displayLinkLabel,
  displayLinkUrl,

  GENRE_OPTIONS,
  BOOK_TYPE_OPTIONS,

  Detail,
  PersonRow,
}: BookInfoTabProps) {
  const [authorSearch, setAuthorSearch] = useState("");
  const [authorResults, setAuthorResults] = useState<PersonRecord[]>([]);
  const [authorSearchLoading, setAuthorSearchLoading] = useState(false);

  const [publisherSearch, setPublisherSearch] = useState("");
  const [publisherResults, setPublisherResults] = useState<PublisherRecord[]>([]);
  const [publisherSearchLoading, setPublisherSearchLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function runAuthorSearch() {
      const cleaned = authorSearch.trim();

      if (!isEditing || !cleaned) {
        setAuthorResults([]);
        return;
      }

      setAuthorSearchLoading(true);

      const { data, error } = await supabase
        .from("people")
        .select("id, name_ja, name_en, reading, image_url, normalized_name")
        .or(
          [
            `name_ja.ilike.%${cleaned}%`,
            `name_en.ilike.%${cleaned}%`,
            `reading.ilike.%${cleaned}%`,
          ].join(",")
        )
        .order("name_ja", { ascending: true })
        .limit(8);

      if (!cancelled) {
        if (error) {
          console.error("Error searching authors:", error);
          setAuthorResults([]);
        } else {
          setAuthorResults((data ?? []) as PersonRecord[]);
        }
        setAuthorSearchLoading(false);
      }
    }

    runAuthorSearch();

    return () => {
      cancelled = true;
    };
  }, [authorSearch, isEditing]);

  useEffect(() => {
    let cancelled = false;

    async function runPublisherSearch() {
      const cleaned = publisherSearch.trim();

      if (!isEditing || !cleaned) {
        setPublisherResults([]);
        return;
      }

      setPublisherSearchLoading(true);

      const { data, error } = await supabase
        .from("publishers")
        .select("id, name_ja, name_en, reading, logo_url, normalized_name")
        .or(
          [
            `name_ja.ilike.%${cleaned}%`,
            `name_en.ilike.%${cleaned}%`,
            `reading.ilike.%${cleaned}%`,
          ].join(",")
        )
        .order("name_ja", { ascending: true })
        .limit(8);

      if (!cancelled) {
        if (error) {
          console.error("Error searching publishers:", error);
          setPublisherResults([]);
        } else {
          setPublisherResults((data ?? []) as PublisherRecord[]);
        }
        setPublisherSearchLoading(false);
      }
    }

    runPublisherSearch();

    return () => {
      cancelled = true;
    };
  }, [publisherSearch, isEditing]);

  function handleSelectAuthor(person: PersonRecord) {
    setSelectedAuthorId(person.id);
    setAuthorSearch(person.name_ja);
    setAuthorName(person.name_ja);
    setAuthorReading(person.reading ?? "");
    setAuthorImg(person.image_url ?? "");
    setAuthorResults([]);
  }

  function clearSelectedAuthor() {
    setSelectedAuthorId(null);
    setAuthorSearch("");
  }

  function handleSelectPublisher(publisher: PublisherRecord) {
    setSelectedPublisherId(publisher.id);
    setPublisherSearch(publisher.name_ja);
    setPublisherName(publisher.name_ja);
    setPublisherEnglishName(publisher.name_en ?? "");
    setPublisherReading(publisher.reading ?? "");
    setPublisherImg(publisher.logo_url ?? "");
    setPublisherResults([]);
  }

  function clearSelectedPublisher() {
    setSelectedPublisherId(null);
    setPublisherSearch("");
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="mb-3 text-sm font-semibold text-stone-900">Book Info</div>

        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div className="rounded border bg-white p-3 text-sm">
            <div className="text-stone-600">Genre</div>
            {!isEditing ? (
              <div className="font-medium">{genreLabel(book.genre)}</div>
            ) : (
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="mt-1 w-full rounded border bg-white px-2 py-1 text-sm"
              >
                <option value="">—</option>
                {GENRE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="rounded border bg-white p-3 text-sm">
            <div className="text-stone-600">Book Type</div>
            {!isEditing ? (
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
            editing={isEditing}
            inputValue={publishedDate}
            setInputValue={setPublishedDate}
            placeholder="e.g. 2005"
          />

          <Detail
            label="Page Count"
            value={book.page_count}
            editing={isEditing}
            inputValue={pageCount}
            setInputValue={setPageCount}
            placeholder="e.g. 352"
          />

          <Detail
            label="ISBN"
            value={book.isbn}
            editing={isEditing}
            inputValue={isbn}
            setInputValue={setIsbn}
            placeholder="ISBN"
          />

          <Detail
            label="ISBN-13"
            value={book.isbn13}
            editing={isEditing}
            inputValue={isbn13}
            setInputValue={setIsbn13}
            placeholder="ISBN-13"
          />
        </div>

        {isEditing ? (
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

        <div className="mt-4">
          <div className="text-sm font-medium">Trigger Warnings</div>
          {!isEditing ? (
            <div className="mt-1 min-h-[40px] whitespace-pre-wrap text-sm text-stone-700">
              {book.trigger_warnings?.trim() ? book.trigger_warnings : "—"}
            </div>
          ) : (
            <textarea
              value={triggerWarnings}
              onChange={(e) => setTriggerWarnings(e.target.value)}
              placeholder="Anything you want to flag"
              className="mt-2 min-h-[90px] w-full rounded border p-3 text-sm outline-none focus:ring-2 focus:ring-stone-300"
            />
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="mb-3 text-sm font-semibold text-stone-900">People</div>

        <div className="space-y-4">
          <div className="space-y-2">
            {isEditing ? (
              <div className="rounded border bg-white p-3 text-sm">
                <label className="mb-1 block text-sm font-medium text-stone-700">
                  Search existing author
                </label>
                <input
                  value={authorSearch}
                  onChange={(e) => {
                    setAuthorSearch(e.target.value);
                    setSelectedAuthorId(null);
                  }}
                  placeholder="宮沢 賢治 / Kenji Miyazawa / みやざわ けんじ"
                  className="w-full rounded border px-2 py-1 text-sm"
                />

                {authorSearchLoading ? (
                  <div className="mt-2 text-xs text-stone-500">Searching…</div>
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
              </div>
            ) : null}

            <PersonRow
              label="Author"
              name={isEditing ? authorName : book.author}
              reading={isEditing ? authorReading : book.author_reading}
              img={isEditing ? authorImg : book.author_image_url}
              editing={isEditing}
              nameValue={authorName}
              setNameValue={(value) => {
                setAuthorName(value);
                setSelectedAuthorId(null);
              }}
              imgValue={authorImg}
              setImgValue={setAuthorImg}
              readingValue={authorReading}
              setReadingValue={setAuthorReading}
            />
          </div>

          {(book.translator || book.translator_image_url || isEditing) && (
            <PersonRow
              label="Translator"
              name={isEditing ? translatorName : book.translator}
              reading={isEditing ? translatorReading : book.translator_reading}
              img={isEditing ? translatorImg : book.translator_image_url}
              editing={isEditing}
              nameValue={translatorName}
              setNameValue={setTranslatorName}
              imgValue={translatorImg}
              setImgValue={setTranslatorImg}
              readingValue={translatorReading}
              setReadingValue={setTranslatorReading}
            />
          )}

          {(book.illustrator || book.illustrator_image_url || isEditing) && (
            <PersonRow
              label="Illustrator"
              name={isEditing ? illustratorName : book.illustrator}
              reading={isEditing ? illustratorReading : book.illustrator_reading}
              img={isEditing ? illustratorImg : book.illustrator_image_url}
              editing={isEditing}
              nameValue={illustratorName}
              setNameValue={setIllustratorName}
              imgValue={illustratorImg}
              setImgValue={setIllustratorImg}
              readingValue={illustratorReading}
              setReadingValue={setIllustratorReading}
            />
          )}

          {(book.publisher || book.publisher_image_url || isEditing) && (
            <div className="space-y-2">
              {isEditing ? (
                <div className="rounded border bg-white p-3 text-sm">
                  <label className="mb-1 block text-sm font-medium text-stone-700">
                    Search existing publisher
                  </label>
                  <input
                    value={publisherSearch}
                    onChange={(e) => {
                      setPublisherSearch(e.target.value);
                      setSelectedPublisherId(null);
                    }}
                    placeholder="講談社 / Kodansha / こうだんしゃ"
                    className="w-full rounded border px-2 py-1 text-sm"
                  />

                  {publisherSearchLoading ? (
                    <div className="mt-2 text-xs text-stone-500">Searching…</div>
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
                name={isEditing ? publisherName : book.publisher}
                reading={isEditing ? publisherReading : book.publisher_reading}
                img={isEditing ? publisherImg : book.publisher_image_url}
                editing={isEditing}
                nameValue={publisherName}
                setNameValue={(value) => {
                  setPublisherName(value);
                  setSelectedPublisherId(null);
                }}
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
        <div className="mb-3 text-sm font-semibold text-stone-900">Related Links</div>

        {relatedLinksArr.length > 0 ? (
          <ul className="space-y-2 text-sm">
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
                      className="text-blue-600 hover:underline"
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

        {isEditing ? (
          <p className="mt-3 text-xs text-stone-500">
            Related link editing is not wired into this extracted component yet.
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="mb-3 text-sm font-semibold text-stone-900">My Copy</div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded border bg-white p-3 text-sm">
            <div className="text-stone-600">Format</div>
            {!isEditing ? (
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
            {!isEditing ? (
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
            <div className="text-stone-600">Show Page Numbers</div>
            {!isEditing ? (
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
    </div>
  );
}