const KANJI_ENRICHMENT_TEST_START = "2026-04-20T00:00:00";

type SupabaseLike = any;

type KanjiCountWordRow = {
  id: string;
  user_book_id: string;
  created_at?: string | null;
  surface: string | null;
  reading: string | null;
  vocabulary_cache_id: number | null;
  ignore_kanji_enrichment?: boolean | null;
};

type KanjiCountMapRow = {
  id: number;
  vocabulary_cache_id: number;
  kanji_position: number;
  reading_type: "on" | "kun" | "other" | null;
  base_reading: string | null;
  realized_reading: string | null;
  flagged_for_review?: boolean | null;
  flagged_at?: string | null;
  excluded_from_kanji_practice?: boolean | null;
};

type VocabularyCacheRow = {
  id: number;
  surface: string | null;
  reading: string | null;
};

type ActiveKanjiQueueSummary = {
  count: number;
  dates: string[];
};

const WORD_ROW_PAGE_SIZE = 1000;
const MAP_ROW_PAGE_SIZE = 1000;

function hasKanji(value: string) {
  return /[\p{Script=Han}]/u.test(value);
}

function kanjiChars(value: string) {
  return Array.from(value).filter((ch) => /\p{Script=Han}/u.test(ch));
}

function effectiveKanjiReadingType(
  row: Pick<KanjiCountMapRow, "reading_type" | "base_reading" | "realized_reading">
) {
  if (row.reading_type) return row.reading_type;
  return row.base_reading?.trim() && row.realized_reading?.trim() ? "on" : null;
}

function cacheRowMatchesWord(
  cacheRow: VocabularyCacheRow | undefined,
  surface: string,
  reading: string
) {
  if (!cacheRow) return false;
  return (
    (cacheRow.surface ?? "").trim() === surface.trim() &&
    (cacheRow.reading ?? "").trim() === reading.trim()
  );
}

function kanjiQueueIdentity(params: {
  vocabularyCacheId: number | null;
  surface: string;
  reading: string;
}) {
  if (params.vocabularyCacheId) return `cache:${params.vocabularyCacheId}`;
  return `word:${params.surface.trim()}::${params.reading.trim()}`;
}

function isActiveKanjiQueueStatus(params: {
  vocabularyCacheId: number | null;
  surface: string;
  mapRows: KanjiCountMapRow[];
  ignored?: boolean | null;
}) {
  const mapRows = params.mapRows;
  const kanjiCount = kanjiChars(params.surface).length;
  const flaggedMapRowCount = mapRows.filter((row) => row.flagged_for_review).length;
  const excludedMapRowCount = mapRows.filter((row) => row.excluded_from_kanji_practice).length;

  if (
    params.ignored ||
    (mapRows.length > 0 &&
      excludedMapRowCount === mapRows.length &&
      flaggedMapRowCount === 0)
  ) {
    return false;
  }

  if (!params.vocabularyCacheId || mapRows.length === 0 || flaggedMapRowCount > 0) {
    return true;
  }

  const completePositions = new Set(
    mapRows
      .filter(
        (row) =>
          typeof row.kanji_position === "number" &&
          !!effectiveKanjiReadingType(row) &&
          !!row.base_reading &&
          !!row.realized_reading
      )
      .map((row) => row.kanji_position)
  );

  const incompleteRowCount = mapRows.filter(
    (row) => !effectiveKanjiReadingType(row) || !row.base_reading || !row.realized_reading
  ).length;

  return completePositions.size < kanjiCount || incompleteRowCount > 0;
}

async function loadKanjiWordRows(
  supabase: SupabaseLike,
  userBookIds: string[],
  createdSince?: string | null
) {
  const rows: KanjiCountWordRow[] = [];
  const userBookChunkSize = 100;

  for (let i = 0; i < userBookIds.length; i += userBookChunkSize) {
    const userBookIdChunk = userBookIds.slice(i, i + userBookChunkSize);
    let from = 0;

    while (true) {
      let query = supabase
        .from("user_book_words")
        .select("id, user_book_id, surface, reading, vocabulary_cache_id, ignore_kanji_enrichment, created_at")
        .in("user_book_id", userBookIdChunk)
        .eq("is_manual_override", false)
        .gte("created_at", createdSince ?? KANJI_ENRICHMENT_TEST_START)
        .order("created_at", { ascending: true });

      const { data, error } = await query.range(from, from + WORD_ROW_PAGE_SIZE - 1);

      if (error) throw error;

      const pageRows = (data ?? []) as KanjiCountWordRow[];
      rows.push(...pageRows);

      if (pageRows.length < WORD_ROW_PAGE_SIZE) break;
      from += WORD_ROW_PAGE_SIZE;
    }
  }

  return rows;
}

async function loadCacheAndMapRows(
  supabase: SupabaseLike,
  cacheIds: number[],
  cacheRowsById: Map<number, VocabularyCacheRow>,
  mapRowsByCacheId: Map<string, KanjiCountMapRow[]>
) {
  if (cacheIds.length === 0) return;

  const chunkSize = 100;

  for (let i = 0; i < cacheIds.length; i += chunkSize) {
    const cacheIdChunk = cacheIds.slice(i, i + chunkSize);

    const { data: cacheRows, error: cacheRowsError } = await supabase
      .from("vocabulary_cache")
      .select("id, surface, reading")
      .in("id", cacheIdChunk);

    if (cacheRowsError) throw cacheRowsError;

    for (const row of (cacheRows ?? []) as VocabularyCacheRow[]) {
      cacheRowsById.set(Number(row.id), row);
    }

    let from = 0;

    while (true) {
      const { data: mapRows, error: mapError } = await supabase
        .from("vocabulary_kanji_map")
        .select(
          "id, vocabulary_cache_id, kanji_position, reading_type, base_reading, realized_reading, flagged_for_review, flagged_at, excluded_from_kanji_practice"
        )
        .in("vocabulary_cache_id", cacheIdChunk)
        .order("id", { ascending: true })
        .range(from, from + MAP_ROW_PAGE_SIZE - 1);

      if (mapError) throw mapError;

      const pageRows = (mapRows ?? []) as KanjiCountMapRow[];

      for (const row of pageRows) {
        const cacheKey = String(row.vocabulary_cache_id);
        const existing = mapRowsByCacheId.get(cacheKey) ?? [];
        existing.push(row);
        mapRowsByCacheId.set(cacheKey, existing);
      }

      if (pageRows.length < MAP_ROW_PAGE_SIZE) break;
      from += MAP_ROW_PAGE_SIZE;
    }
  }
}

async function loadOldFlaggedRows(supabase: SupabaseLike, flaggedSince?: string | null) {
  const rows: KanjiCountMapRow[] = [];
  let from = 0;

  while (true) {
    let query = supabase
      .from("vocabulary_kanji_map")
      .select(
        "id, vocabulary_cache_id, kanji_position, reading_type, base_reading, realized_reading, flagged_for_review, flagged_at, excluded_from_kanji_practice"
      )
      .eq("flagged_for_review", true)
      .order("id", { ascending: true });

    if (flaggedSince) {
      query = query.gte("flagged_at", flaggedSince);
    }

    const { data, error } = await query.range(from, from + MAP_ROW_PAGE_SIZE - 1);

    if (error) throw error;

    const pageRows = (data ?? []) as KanjiCountMapRow[];
    rows.push(...pageRows);

    if (pageRows.length < MAP_ROW_PAGE_SIZE) break;
    from += MAP_ROW_PAGE_SIZE;
  }

  return rows;
}

async function loadOpenReportRows(supabase: SupabaseLike, createdSince?: string | null) {
  const rows: any[] = [];
  let from = 0;

  while (true) {
    let query = supabase
      .from("kanji_map_reports")
      .select("id, vocabulary_kanji_map_id, created_at, status")
      .in("status", ["open", "reviewing"])
      .order("id", { ascending: true });

    if (createdSince) {
      query = query.gte("created_at", createdSince);
    }

    const { data, error } = await query.range(from, from + MAP_ROW_PAGE_SIZE - 1);

    if (error) throw error;

    const pageRows = data ?? [];
    rows.push(...pageRows);

    if (pageRows.length < MAP_ROW_PAGE_SIZE) break;
    from += MAP_ROW_PAGE_SIZE;
  }

  return rows;
}

async function loadWordSkyImportRows(supabase: SupabaseLike) {
  const rows: KanjiCountMapRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("vocabulary_kanji_map")
      .select(
        "id, vocabulary_cache_id, kanji_position, reading_type, base_reading, realized_reading, flagged_for_review, flagged_at, excluded_from_kanji_practice"
      )
      .eq("excluded_from_kanji_practice", true)
      .eq("reading_type", "other")
      .eq("flagged_for_review", false)
      .is("flagged_at", null)
      .order("id", { ascending: true })
      .range(from, from + MAP_ROW_PAGE_SIZE - 1);

    if (error) throw error;

    const pageRows = (data ?? []) as KanjiCountMapRow[];
    rows.push(...pageRows);

    if (pageRows.length < MAP_ROW_PAGE_SIZE) break;
    from += MAP_ROW_PAGE_SIZE;
  }

  return rows;
}

export async function loadActiveKanjiQueueSummary(params: {
  supabase: SupabaseLike;
  isSuperTeacher: boolean;
  studentIds: string[];
  createdSince?: string | null;
}): Promise<ActiveKanjiQueueSummary> {
  const { supabase, isSuperTeacher, studentIds, createdSince } = params;

  let userBooksQuery = supabase.from("user_books").select("id, user_id");
  if (!isSuperTeacher) userBooksQuery = userBooksQuery.in("user_id", studentIds);

  const { data: kanjiUserBooks, error: userBooksError } = await userBooksQuery;
  if (userBooksError) throw userBooksError;

  const kanjiUserBookIds = ((kanjiUserBooks ?? []) as { id: string }[])
    .map((book) => book.id)
    .filter(Boolean);

  if (kanjiUserBookIds.length === 0) return { count: 0, dates: [] };

  const kanjiWordRows = await loadKanjiWordRows(supabase, kanjiUserBookIds, createdSince);

  const kanjiWords = kanjiWordRows.filter((word) => hasKanji(word.surface ?? ""));

  const cacheIds = Array.from(
    new Set(
      kanjiWords
        .map((word) => (word.vocabulary_cache_id == null ? null : Number(word.vocabulary_cache_id)))
        .filter((id): id is number => Number.isFinite(id))
    )
  );

  const cacheRowsById = new Map<number, VocabularyCacheRow>();
  const mapRowsByCacheId = new Map<string, KanjiCountMapRow[]>();

  await loadCacheAndMapRows(supabase, cacheIds, cacheRowsById, mapRowsByCacheId);

  const [oldFlaggedRows, reportRows, wordSkyImportRows] = await Promise.all([
    loadOldFlaggedRows(supabase, createdSince),
    loadOpenReportRows(supabase, createdSince),
    createdSince ? Promise.resolve([]) : loadWordSkyImportRows(supabase),
  ]);

  const reportCreatedAtByMapId = new Map<number, string | null>();
  for (const row of (reportRows ?? []) as any[]) {
    const mapId = Number(row.vocabulary_kanji_map_id);
    if (Number.isFinite(mapId)) {
      reportCreatedAtByMapId.set(mapId, row.created_at ?? null);
    }
  }

  const reportedKanjiMapIds = Array.from(
    new Set(
      ((reportRows ?? []) as any[])
        .map((row) => Number(row.vocabulary_kanji_map_id))
        .filter((id) => Number.isFinite(id))
    )
  );

  let reportedMapRows: KanjiCountMapRow[] = [];

  if (reportedKanjiMapIds.length > 0) {
    const reportedMapRowChunks: KanjiCountMapRow[] = [];

    for (let i = 0; i < reportedKanjiMapIds.length; i += 100) {
      const idChunk = reportedKanjiMapIds.slice(i, i + 100);
      const { data: reportMapRows, error: reportMapRowsError } = await supabase
        .from("vocabulary_kanji_map")
        .select(
          "id, vocabulary_cache_id, kanji_position, reading_type, base_reading, realized_reading, flagged_for_review, flagged_at, excluded_from_kanji_practice"
        )
        .in("id", idChunk);

      if (reportMapRowsError) throw reportMapRowsError;
      reportedMapRowChunks.push(...((reportMapRows ?? []) as KanjiCountMapRow[]));
    }

    reportedMapRows = reportedMapRowChunks.map((row) => ({
      ...row,
      flagged_for_review: true,
      flagged_at: row.flagged_at ?? reportCreatedAtByMapId.get(Number(row.id)) ?? null,
    }));
  }

  const flaggedRowsById = new Map<number, KanjiCountMapRow>();
  for (const row of (oldFlaggedRows ?? []) as KanjiCountMapRow[]) flaggedRowsById.set(Number(row.id), row);
  for (const row of reportedMapRows) flaggedRowsById.set(Number(row.id), row);

  const flaggedRows = Array.from(flaggedRowsById.values());
  const wordSkyRows = (wordSkyImportRows ?? []) as KanjiCountMapRow[];
  const knownCacheIds = new Set(cacheIds.map((id) => String(id)));
  const flaggedCacheIds = Array.from(
    new Set(
      flaggedRows
        .map((row) => Number(row.vocabulary_cache_id))
        .filter((id) => Number.isFinite(id))
    )
  );
  const wordSkyImportCacheIds = Array.from(
    new Set(
      wordSkyRows
        .map((row) => Number(row.vocabulary_cache_id))
        .filter((id) => Number.isFinite(id))
    )
  );

  for (const row of flaggedRows) {
    const cacheKey = String(row.vocabulary_cache_id);
    if (knownCacheIds.has(cacheKey)) continue;

    const existing = mapRowsByCacheId.get(cacheKey) ?? [];
    existing.push(row);
    mapRowsByCacheId.set(cacheKey, existing);
  }

  const flaggedOnlyCacheIds = flaggedCacheIds.filter((id) => !knownCacheIds.has(String(id)));
  const wordSkyOnlyCacheIds = wordSkyImportCacheIds.filter(
    (id) => !knownCacheIds.has(String(id)) && !flaggedCacheIds.includes(id)
  );
  const cacheOnlyQueueIds = Array.from(new Set([...flaggedOnlyCacheIds, ...wordSkyOnlyCacheIds]));
  await loadCacheAndMapRows(supabase, cacheOnlyQueueIds, cacheRowsById, mapRowsByCacheId);

  const activeKeys = new Set<string>();
  const dates: string[] = [];

  if (createdSince) {
    for (const cacheId of flaggedCacheIds) {
      const cacheRow = cacheRowsById.get(cacheId);
      const surface = String(cacheRow?.surface ?? "");
      if (!surface || !hasKanji(surface)) continue;

      const mapRows = mapRowsByCacheId.get(String(cacheId)) ?? [];
      const hasRecentFlag = mapRows.some((row) => row.flagged_for_review === true);
      if (!hasRecentFlag) continue;

      activeKeys.add(kanjiQueueIdentity({
        vocabularyCacheId: cacheId,
        surface,
        reading: String(cacheRow?.reading ?? ""),
      }));

      const flagDate = mapRows.find((row) => row.flagged_for_review && row.flagged_at)?.flagged_at;
      if (flagDate) dates.push(flagDate);
    }

    return { count: activeKeys.size, dates };
  }

  for (const word of kanjiWords) {
    const surface = String(word.surface ?? "");
    const reading = String(word.reading ?? "");
    const rawVocabularyCacheId = word.vocabulary_cache_id == null ? null : Number(word.vocabulary_cache_id);
    const vocabularyCacheId =
      rawVocabularyCacheId != null &&
      cacheRowMatchesWord(cacheRowsById.get(rawVocabularyCacheId), surface, reading)
        ? rawVocabularyCacheId
        : null;
    const mapRows =
      vocabularyCacheId != null ? mapRowsByCacheId.get(String(vocabularyCacheId)) ?? [] : [];

    const isWordSkyImport = mapRows.some(
      (row) =>
        row.excluded_from_kanji_practice === true &&
        row.reading_type === "other" &&
        row.flagged_for_review !== true
    );
    const isActive =
      (isWordSkyImport && !word.ignore_kanji_enrichment) ||
      isActiveKanjiQueueStatus({
        vocabularyCacheId,
        surface,
        mapRows,
        ignored: word.ignore_kanji_enrichment,
      });

    if (isActive) {
      const key = kanjiQueueIdentity({ vocabularyCacheId, surface, reading });
      if (activeKeys.has(key)) continue;
      activeKeys.add(key);
      if (word.created_at) dates.push(word.created_at);
    }
  }

  for (const cacheId of cacheOnlyQueueIds) {
    const cacheRow = cacheRowsById.get(cacheId);
    const surface = String(cacheRow?.surface ?? "");
    if (!surface || !hasKanji(surface)) continue;

    const mapRows = mapRowsByCacheId.get(String(cacheId)) ?? [];
    const isWordSkyImport = mapRows.some(
      (row) =>
        row.excluded_from_kanji_practice === true &&
        row.reading_type === "other" &&
        row.flagged_for_review !== true
    );

    if (isWordSkyImport || isActiveKanjiQueueStatus({ vocabularyCacheId: cacheId, surface, mapRows })) {
      activeKeys.add(kanjiQueueIdentity({
        vocabularyCacheId: cacheId,
        surface,
        reading: String(cacheRow?.reading ?? ""),
      }));

      const flagDate = mapRows.find((row) => row.flagged_for_review && row.flagged_at)?.flagged_at;
      if (flagDate) dates.push(flagDate);
    }
  }

  return { count: activeKeys.size, dates };
}
