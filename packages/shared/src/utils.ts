// Handles: £50,000  $80,000  €45.000  60k  32,000  32.000 (European thousands)
// For ranges like "60k–80k" only the first number is parsed.
export function parseSalary(salary: string | undefined): number | null {
  if (!salary) return null;
  let s = salary.replace(/[£$€\s]/g, "");
  // European thousand-separator: digit.3digits → remove the period (32.000 → 32000)
  s = s.replace(/(\d)\.(\d{3})(?!\d)/g, "$1$2");
  // Strip remaining commas (US/UK thousand separator)
  s = s.replace(/,/g, "");
  const match = s.match(/(\d+(?:\.\d+)?)(k)?/i);
  if (!match) return null;
  const value = parseFloat(match[1]);
  return match[2]?.toLowerCase() === "k" ? value * 1000 : value;
}
