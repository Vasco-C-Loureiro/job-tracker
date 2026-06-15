import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, getISOWeek, isSameMonth, format,
} from "date-fns";
import type { CalendarFeedEvent } from "@job-tracker/shared";

/** Returns a 2D array of weeks (rows) × days (Mon→Sun) for the given anchor month.
 *  Leading/trailing cells from adjacent months fill partial rows. */
export function monthMatrix(anchor: Date): Date[][] {
  const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
  const end   = endOfWeek(endOfMonth(anchor),     { weekStartsOn: 1 });
  const days  = eachDayOfInterval({ start, end });
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

/** ISO week number for a date. */
export function isoWeek(d: Date): number {
  return getISOWeek(d);
}

/** Is the day in the same calendar month as the anchor? */
export function isSameMonthAs(day: Date, anchor: Date): boolean {
  return isSameMonth(day, anchor);
}

/** Format a date as 'yyyy-MM-dd' for event matching. */
export function ymd(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

/** Sort events for a single day: timed events first (ascending), then untimed in original order. */
export function sortDayEvents(events: CalendarFeedEvent[]): CalendarFeedEvent[] {
  const timed   = events.filter(e => e.time != null).sort((a, b) => a.time!.localeCompare(b.time!));
  const untimed = events.filter(e => e.time == null);
  return [...timed, ...untimed];
}
