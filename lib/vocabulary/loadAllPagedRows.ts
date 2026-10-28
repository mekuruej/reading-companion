type PagedRowsResult<T> = {
  data: T[] | null;
  error: unknown;
  count: number | null;
};

/** Complete, deterministically assembled pages. Existing callers remain serial.
 * Exact counts, page lengths and IDs are checked before assigning more work.
 * Count/duplicate checks detect many concurrent edits, not a database snapshot.
 */
export async function loadAllPagedRows<T extends { id: string }>(
  fetchPage: (from: number, to: number) => PromiseLike<PagedRowsResult<T>>,
  pageSize = 500,
  concurrency = 1,
): Promise<T[]> {
  if (!Number.isSafeInteger(pageSize) || pageSize <= 0 || pageSize > 500) {
    throw new Error("Vocabulary page size must be between 1 and 500 rows.");
  }
  if (!Number.isSafeInteger(concurrency) || concurrency < 1 || concurrency > 4) {
    throw new Error("Vocabulary concurrency must be between 1 and 4 requests.");
  }
  const pages: T[][] = [];
  const seenIds = new Set<string>();
  let expectedCount: number | null = null;
  async function loadPage(index: number) {
    const offset = index * pageSize;
    const result = await fetchPage(offset, offset + pageSize - 1);
    if (result.error) throw result.error;
    if (!Number.isSafeInteger(result.count) || result.count === null || result.count < 0) {
      throw new Error("Could not verify the complete vocabulary list. Please reload and try again.");
    }
    if (expectedCount === null) expectedCount = result.count;
    else if (result.count !== expectedCount) {
      throw new Error("The vocabulary list changed while loading. Please reload and try again.");
    }
    const page = result.data ?? [];
    if (page.length !== Math.min(pageSize, expectedCount - offset)) {
      throw new Error("Could not load the complete vocabulary list. Please reload and try again.");
    }
    for (const row of page) {
      if (!row.id || seenIds.has(row.id)) {
        throw new Error("Could not verify a complete, duplicate-free vocabulary list. Please reload and try again.");
      }
      seenIds.add(row.id);
    }
    pages[index] = page;
  }
  // Establish the count before calculating independent page boundaries.
  await loadPage(0);
  const pageCount = Math.max(1, Math.ceil(expectedCount! / pageSize));
  let nextPage = 1;
  let failed = false;
  let failure: unknown;
  async function worker() {
    while (!failed && nextPage < pageCount) {
      const index = nextPage++;
      try { await loadPage(index); }
      catch (error) { if (!failed) { failed = true; failure = error; } }
    }
  }
  // Drain requests already in flight; never return a partial result after failure.
  await Promise.all(Array.from({ length: Math.min(concurrency, pageCount - 1) }, worker));
  if (failed) throw failure;
  const rows = pages.flat();
  if (pages.length !== pageCount || Array.from({ length: pageCount }, (_, i) => pages[i]).some(p => !p) || rows.length !== expectedCount) {
    throw new Error("Could not load the complete vocabulary list. Please reload and try again.");
  }
  return rows;
}
