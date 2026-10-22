type PagedRowsResult<T> = {
  data: T[] | null;
  error: unknown;
  count: number | null;
};

/**
 * Retrieve a complete ordered result set through bounded PostgREST ranges.
 * Every request verifies the exact count so a failed or changing result set
 * cannot be returned as a complete list.
 */
export async function loadAllPagedRows<T extends { id: string }>(
  fetchPage: (from: number, to: number) => PromiseLike<PagedRowsResult<T>>,
  pageSize = 500
): Promise<T[]> {
  if (!Number.isSafeInteger(pageSize) || pageSize <= 0 || pageSize > 500) {
    throw new Error("Vocabulary page size must be between 1 and 500 rows.");
  }

  const rows: T[] = [];
  const seenIds = new Set<string>();
  let expectedCount: number | null = null;
  let offset = 0;
  let firstPage = true;

  while (firstPage || (expectedCount !== null && offset < expectedCount)) {
    const result = await fetchPage(offset, offset + pageSize - 1);
    firstPage = false;

    if (result.error) throw result.error;
    if (!Number.isSafeInteger(result.count) || result.count === null || result.count < 0) {
      throw new Error("Could not verify the complete vocabulary list. Please reload and try again.");
    }

    if (expectedCount === null) {
      expectedCount = result.count;
    } else if (result.count !== expectedCount) {
      throw new Error("The vocabulary list changed while loading. Please reload and try again.");
    }

    const page = result.data ?? [];
    const expectedPageLength = Math.min(pageSize, expectedCount - offset);
    if (page.length !== expectedPageLength) {
      throw new Error("Could not load the complete vocabulary list. Please reload and try again.");
    }

    for (const row of page) {
      if (!row.id || seenIds.has(row.id)) {
        throw new Error("Could not verify a complete, duplicate-free vocabulary list. Please reload and try again.");
      }
      seenIds.add(row.id);
      rows.push(row);
    }

    offset += page.length;
  }

  if (expectedCount === null || rows.length !== expectedCount) {
    throw new Error("Could not load the complete vocabulary list. Please reload and try again.");
  }

  return rows;
}
