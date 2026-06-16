"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { addYears, subYears, addMonths, subMonths, addWeeks, subWeeks } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import type { CalendarView, CalendarMode, CalendarFeedEvent } from "@job-tracker/shared";
import { fetchCalendarFeed } from "@/lib/calendar/feed";
import { ZOOM_IN, ZOOM_OUT } from "@/lib/calendar/zoom";
import { MonthView } from "./MonthView";
import { WeekView } from "./WeekView";
import { YearView } from "./YearView";
import { YearMonthsView } from "./YearMonthsView";
import { CalendarNavButtons } from "./CalendarNavButtons";

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? "25%" : "-25%", opacity: 0 }),
  centre: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] as const },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? "-25%" : "25%",
    opacity: 0,
    transition: { duration: 0.22, ease: [0.4, 0, 1, 1] as const },
  }),
};

export function CalendarApp() {
  const [view, setView] = useState<CalendarView>("month");
  const [focusedDate, setFocusedDate] = useState<Date>(new Date());
  const [mode, setMode] = useState<CalendarMode>("calendar");
  const [events, setEvents] = useState<CalendarFeedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredPeriod, setHoveredPeriod] = useState<
    | { type: "month"; value: number }
    | { type: "week"; value: Date }
    | { type: "year"; value: number }
    | null
  >(null);
  const [direction, setDirection] = useState<1 | -1>(1);
  const calendarRef = useRef<HTMLDivElement>(null);
  const lastZoomTime = useRef(0);

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

  function prev() {
    setDirection(-1);
    setFocusedDate(d => {
      switch (view) {
        case "year":
        case "year-months": return subYears(d, 1);
        case "month":       return subMonths(d, 1);
        case "week":        return subWeeks(d, 1);
      }
    });
  }

  function next() {
    setDirection(1);
    setFocusedDate(d => {
      switch (view) {
        case "year":
        case "year-months": return addYears(d, 1);
        case "month":       return addMonths(d, 1);
        case "week":        return addWeeks(d, 1);
      }
    });
  }

  const zoomIn = useCallback(() => {
    const nextView = ZOOM_IN[view];
    if (!nextView) return;
    setFocusedDate(prev => {
      if (view === "year" && hoveredPeriod?.type === "year") {
        const d = new Date(prev); d.setFullYear(hoveredPeriod.value); return d;
      }
      if (view === "year-months" && hoveredPeriod?.type === "month") {
        const d = new Date(prev); d.setMonth(hoveredPeriod.value); d.setDate(1); return d;
      }
      if (view === "month" && hoveredPeriod?.type === "week") {
        return new Date(hoveredPeriod.value);
      }
      return prev;
    });
    setView(nextView);
  }, [view, hoveredPeriod]);

  const zoomOut = useCallback(() => {
    const nextView = ZOOM_OUT[view];
    if (!nextView) return;
    setView(nextView);
  }, [view]);

  useEffect(() => {
    const el = calendarRef.current;
    if (!el) return;
    function handleWheel(e: WheelEvent) {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const now = Date.now();
      if (now - lastZoomTime.current < 300) return;
      lastZoomTime.current = now;
      if (e.deltaY < 0) zoomIn();
      else zoomOut();
    }
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [zoomIn, zoomOut]);

  return (
    <div ref={calendarRef} className="mx-6 my-6">

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
      {loading ? (
        <div className="text-sm text-gray-400">Loading calendar…</div>
      ) : (
        <>
          <div className="relative overflow-hidden">
            <AnimatePresence mode="popLayout" custom={direction}>
              <motion.div
                key={`${view}-${focusedDate.getFullYear()}-${focusedDate.getMonth()}-${Math.floor(focusedDate.getDate() / 7)}`}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="centre"
                exit="exit"
              >
                {mode === "upcoming" ? (
                  <div className="text-gray-400">Upcoming list (P21)</div>
                ) : (
                  <>
                    {view === "month"       && (
                      <MonthView
                        focusedDate={focusedDate}
                        events={events}
                        onWeekClick={(weekStart) => {
                          setFocusedDate(weekStart);
                          setView("week");
                        }}
                        onWeekHover={(weekStart) => setHoveredPeriod({ type: "week", value: weekStart })}
                        onDayClick={() => {}}
                        onPrevClick={prev}
                        onNextClick={next}
                      />
                    )}
                    {view === "week"        && (
                      <WeekView
                        focusedDate={focusedDate}
                        events={events}
                        onDayClick={() => {}}
                      />
                    )}
                    {view === "year-months" && (
                      <YearMonthsView
                        focusedDate={focusedDate}
                        events={events}
                        onMonthClick={(monthIdx) => {
                          setFocusedDate(prev => {
                            const d = new Date(prev);
                            d.setMonth(monthIdx);
                            d.setDate(1);
                            return d;
                          });
                          setView("month");
                        }}
                        onMonthHover={(idx) => setHoveredPeriod({ type: "month", value: idx })}
                      />
                    )}
                    {view === "year"        && (
                      <YearView
                        focusedDate={focusedDate}
                        events={events}
                        onYearClick={(year) => {
                          setFocusedDate(prev => {
                            const d = new Date(prev);
                            d.setFullYear(year);
                            return d;
                          });
                          setView("year-months");
                        }}
                        onYearHover={(year) => setHoveredPeriod({ type: "year", value: year })}
                        onPrevClick={prev}
                        onNextClick={next}
                      />
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <CalendarNavButtons onPrev={prev} onNext={next} />
        </>
      )}

    </div>
  );
}
