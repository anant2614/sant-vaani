type Failure = { message: string } | null;

/** The rows of a query, typed by the caller. A failed query throws to the error page. */
export function rows<T>(result: { data: unknown; error: Failure }): T[] {
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []) as T[];
}

/** One row (from .maybeSingle() or .single()), or null. */
export function row<T>(result: { data: unknown; error: Failure }): T | null {
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? null) as T | null;
}

/** The count of a head-only query with { count: 'exact', head: true }. */
export function total(result: { count: number | null; error: Failure }): number {
  if (result.error) throw new Error(result.error.message);
  return result.count ?? 0;
}
