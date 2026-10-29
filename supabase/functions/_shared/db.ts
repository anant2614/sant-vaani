type Result = { data: unknown; error: { message: string } | null };

/** The database API returns at most this many rows per request (max_rows in config.toml). */
const PAGE = 1000;
/** Ids per filter, so a long list stays inside the URL length the API accepts. */
const IDS_PER_REQUEST = 100;

/** Throws with what was being done when a call failed. */
export function check(result: { error: { message: string } | null }, doing: string): void {
  if (result.error) throw new Error(`${doing}: ${result.error.message}`);
}

export function rows<T>(result: Result, doing: string): T[] {
  check(result, doing);
  return (result.data ?? []) as T[];
}

/** Every row of a query, page by page. The query needs a stable order. */
export async function allRows<T>(page: (from: number, to: number) => PromiseLike<Result>, doing: string): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const chunk = rows<T>(await page(from, from + PAGE - 1), doing);
    all.push(...chunk);
    if (chunk.length < PAGE) return all;
  }
}

/** Runs a query filtered by a list of ids, a hundred ids at a time. */
export async function rowsForIds<T>(
  ids: string[],
  query: (chunk: string[]) => PromiseLike<Result>,
  doing: string,
): Promise<T[]> {
  const all: T[] = [];
  for (let i = 0; i < ids.length; i += IDS_PER_REQUEST) {
    all.push(...rows<T>(await query(ids.slice(i, i + IDS_PER_REQUEST)), doing));
  }
  return all;
}

/** Runs work over items a few at a time, so hundreds of small updates finish quickly. */
export async function eachLimited<T>(items: T[], limit: number, work: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < items.length) await work(items[next++]!);
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}
