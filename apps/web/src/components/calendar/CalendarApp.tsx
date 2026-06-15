"use client";

import { useState, useEffect } from "react";
import type { CalendarView, CalendarMode, CalendarFeedEvent } from "@job-tracker/shared";
import { fetchCalendarFeed } from "@/lib/calendar/feed";
import { MonthView } from "./MonthView";
import { WeekView } from "./WeekView";
import { YearView } from "./YearView";

export function CalendarApp() {
  const [view, setView] = useState<CalendarView>("month");
  const [focusedDate, setFocusedDate] = useState<Date>(new Date());
  const [mode, setMode] = useState<CalendarMode>("calendar");
  const [events, setEvents] = useState<CalendarFeedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const data = await fetchCalendarFeed();
      if (!cancelled) {
        setEvents(data);
        setLoading(false);
      }
    };
    void load();
    window.addEventListener("focus", load);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", load);
    };
  }, []);

  return (
    <div className="mx-6 my-6">

      {/* Top bar: mode toggle placeholder + date display */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Mode: {mode}
        </p>
        <p className="text-sm text-gray-400">
          Focused: {focusedDate.toDateString()}
        </p>
      </div>

      {/* Main view area */}
      <div className="relative">
        {loading ? (
          <div className="text-sm text-gray-400">Loading calendar…</div>
        ) : mode === "upcoming" ? (
          <div className="text-gray-400">Upcoming list (P21)</div>
        ) : (
          <>
            {view === "month"       && (
              <MonthView
                focusedDate={focusedDate}
                events={events}
                onWeekClick={() => {}}
                onDayClick={() => {}}
                onPrevClick={() => {}}
                onNextClick={() => {}}
              />
            )}
            {view === "week"        && (
              <WeekView
                focusedDate={focusedDate}
                events={events}
                onDayClick={() => {}}
              />
            )}
            {view === "year-months" && <div className="text-gray-400">Year-with-months view (P16) — {focusedDate.getFullYear()}</div>}
            {view === "year"        && (
              <YearView
                focusedDate={focusedDate}
                events={events}
                onYearClick={() => {}}
                onPrevClick={() => {}}
                onNextClick={() => {}}
              />
            )}
          </>
        )}
      </div>

      {/* Bottom-right nav buttons slot — P19 fills this in */}
      <div className="fixed bottom-6 right-6">
        {/* <CalendarNavButtons /> */}
      </div>

    </div>
  );
}
