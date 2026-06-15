import type { CalendarView } from "@job-tracker/shared";

export const ZOOM_IN: Record<CalendarView, CalendarView | null> = {
  "year":        "year-months",
  "year-months": "month",
  "month":       "week",
  "week":        null,
};

export const ZOOM_OUT: Record<CalendarView, CalendarView | null> = {
  "year":        null,
  "year-months": "year",
  "month":       "year-months",
  "week":        "month",
};
