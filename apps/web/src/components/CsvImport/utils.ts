import type { EnumMap } from "./types";

const ALL_SYNONYMS = [
  "company", "employer", "organisation", "organization", "firm",
  "title", "job title", "role", "position", "job role",
  "location", "city", "place", "area", "region",
  "remote type", "remote", "work type", "work location", "arrangement",
  "job type", "employment type", "contract type", "type",
  "salary", "pay", "compensation", "wage", "package",
  "url", "link", "job url", "application url", "job link",
  "source", "site", "platform", "board", "from",
  "status", "stage", "progress", "application status",
  "notes", "comments", "remarks", "memo",
  "applied at", "date applied", "applied", "application date", "submitted",
  "interest", "interest level", "priority", "keenness",
  "tags", "labels", "categories", "keywords",
];

export function detectHeaderRow(rows: string[][]): number {
  const scores = rows.slice(0, 10).map((row, i) => {
    let score = 0;
    for (const cell of row) {
      const val = cell.trim();
      if (!val) continue;
      score += 1;
      if (/^\d+$/.test(val) || /^\d[\d,.]+$/.test(val)) score -= 2;
      if (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(val)) score -= 2;
      if (ALL_SYNONYMS.includes(val.toLowerCase())) score += 3;
    }
    return { index: i, score };
  });
  scores.sort((a, b) => b.score - a.score);
  return scores[0]?.index ?? 0;
}

export function translateEnumValue(
  rawValue: string,
  enumMap: EnumMap | undefined,
): string | null {
  if (!enumMap) return null;
  for (const group of enumMap.userValues) {
    const candidates = [group.primary, ...group.aliases];
    if (
      candidates.some(
        (c) => c.trim().toLowerCase() === rawValue.trim().toLowerCase()
      )
    ) {
      return enumMap.mappedTo[group.primary] ?? null;
    }
  }
  return null;
}
