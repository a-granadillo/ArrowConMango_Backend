export interface Ranked<T> {
  rank: number;
  entry: T;
}

export interface RankingResult<T> {
  top: Ranked<T>[];
  me: Ranked<T> | null;
}

/**
 * Ranks an already-ordered (descending) list 1-based over the *whole* set,
 * not just the returned top slice — so a player outside the top N still
 * gets their real rank instead of being omitted or clamped to N.
 */
export function rankWithSelf<T>(
  ordered: T[],
  topN: number,
  isSelf: (item: T) => boolean,
): RankingResult<T> {
  const ranked = ordered.map((entry, index) => ({ rank: index + 1, entry }));
  const top = ranked.slice(0, topN);
  const me = ranked.find((r) => isSelf(r.entry)) ?? null;

  return { top, me };
}
