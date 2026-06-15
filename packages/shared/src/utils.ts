// Handles: £50,000  $80,000  €45.000  60k  32,000  32.000 (European thousands)
//          £40,000–£60,000  60k–80k  (ranges → distinct min and max)
// Single value → { min: X, max: X }. Unparseable → null.
export function parseSalary(salary: string | undefined): { min: number; max: number } | null {
  if (!salary) return null;
  let s = salary.replace(/[£$€\s]/g, "");
  // European thousand-separator: digit.3digits → remove the period (32.000 → 32000)
  s = s.replace(/(\d)\.(\d{3})(?!\d)/g, "$1$2");
  // Strip remaining commas (US/UK thousand separator)
  s = s.replace(/,/g, "");

  const toNum = (m: RegExpMatchArray): number => {
    const v = parseFloat(m[1]);
    return m[2]?.toLowerCase() === "k" ? v * 1000 : v;
  };

  const matches = [...s.matchAll(/(\d+(?:\.\d+)?)(k)?/gi)];
  if (matches.length === 0) return null;

  const first = toNum(matches[0]);

  if (matches.length >= 2) {
    const firstEnd = matches[0].index! + matches[0][0].length;
    const secondStart = matches[1].index!;
    const between = s.slice(firstEnd, secondStart);
    // Treat as a range only when the two numbers are separated by a clear range marker
    if (/^[-–—~]$|^to$/i.test(between)) {
      const second = toNum(matches[1]);
      return { min: Math.min(first, second), max: Math.max(first, second) };
    }
  }

  return { min: first, max: first };
}

/**
 * Normalises a URL for duplicate detection.
 * Keeps only origin + pathname, strips query string and fragment, lowercases.
 *
 * Matches the SQL expression:
 *   LOWER(regexp_replace(source_url, '[?#].*$', ''))
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return (parsed.origin + parsed.pathname).toLowerCase();
  } catch {
    // Unparseable URL — degrade gracefully
    return url.toLowerCase().trim();
  }
}
