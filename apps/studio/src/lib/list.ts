/** A copy of the list with one item moved up (-1) or down (+1). */
export function move<T>(items: readonly T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta;
  const copy = [...items];
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) return copy;
  [copy[index], copy[target]] = [copy[target] as T, copy[index] as T];
  return copy;
}
