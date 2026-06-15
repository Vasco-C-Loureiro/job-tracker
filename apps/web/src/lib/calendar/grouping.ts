import type { CalendarFeedEvent } from "@job-tracker/shared";
import { colorClasses } from "@/lib/calendar/colors";

export interface AppliedGroup {
  count: number;
  label: string;
  companies: string[];
  pillClasses: string;
}

/**
 * Given all CalendarFeedEvents for a single day, returns grouping info
 * for the applied-source events, or null if there are none.
 */
export function groupAppliedForDay(dayEvents: CalendarFeedEvent[]): AppliedGroup | null {
  const applied = dayEvents.filter(e => e.source === "applied");
  if (applied.length === 0) return null;

  const companies = applied.map(e => e.company ?? "Unknown");
  const count = applied.length;
  const label =
    count === 1
      ? companies[0]
      : `Applied to ${companies[0]}, +${count - 1} more`;

  return {
    count,
    label,
    companies,
    pillClasses: colorClasses("applied", "pill"),
  };
}

/**
 * Returns how many dots to show for N applied events on a compact day cell.
 * 1 → 1, 2 → 2, 3+ → 3.
 */
export function appliedDotCount(count: number): 1 | 2 | 3 {
  if (count <= 1) return 1;
  if (count === 2) return 2;
  return 3;
}
