export function normalizeChar(ch: string): string {
  return ch
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
}

export function normalizeText(s: string): string {
  return normalizeChar(s).trim();
}

export function normalizeWithMap(s: string): { normalized: string; map: number[] } {
  let normalized = "";
  const map: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const piece = normalizeChar(s[i]);
    for (let j = 0; j < piece.length; j++) {
      map.push(i);
    }
    normalized += piece;
  }
  return { normalized, map };
}

export type HighlightRange = [start: number, end: number];

/**
 * Finds character ranges in `text` (original, un-normalized) that match
 * `normalizedQuery`. Match policy: non-overlapping — the scan advances past
 * each match by the full query length, so overlapping occurrences are skipped.
 * Adjacent or touching ranges are merged into a single range.
 */
export function findHighlightRanges(text: string, normalizedQuery: string): HighlightRange[] {
  if (!normalizedQuery) return [];
  const { normalized, map } = normalizeWithMap(text);
  const ranges: HighlightRange[] = [];
  let from = 0;
  while (from <= normalized.length - normalizedQuery.length) {
    const idx = normalized.indexOf(normalizedQuery, from);
    if (idx === -1) break;
    const start = map[idx];
    const end = map[idx + normalizedQuery.length - 1] + 1;
    if (ranges.length > 0 && start <= ranges[ranges.length - 1][1]) {
      ranges[ranges.length - 1][1] = Math.max(ranges[ranges.length - 1][1], end);
    } else {
      ranges.push([start, end]);
    }
    from = idx + normalizedQuery.length;
  }
  return ranges;
}
