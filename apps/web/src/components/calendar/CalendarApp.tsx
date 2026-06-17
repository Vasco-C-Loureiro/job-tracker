"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { addYears, subYears, addMonths, subMonths, addWeeks, subWeeks } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { CalendarView, CalendarMode, CalendarFeedEvent } from "@job-tracker/shared";
import { fetchCalendarFeed } from "@/lib/calendar/feed";
import { ZOOM_IN, ZOOM_OUT } from "@/lib/calendar/zoom";
import { MonthView } from "./MonthView";
import { WeekView } from "./WeekView";
import { YearView } from "./YearView";
import { YearMonthsView } from "./YearMonthsView";
import { CalendarNavButtons } from "./CalendarNavButtons";
import { UpcomingList } from "./UpcomingList";
import { MonthGrid } from "./MonthGrid";

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
  const mainRef = useRef<HTMLDivElement>(null);
  const [mainWidth, setMainWidth] = useState<number>(700);
  const [contentLeft, setContentLeft] = useState(80);
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1440
  );
  const lastZoomTime = useRef(0);
  const horizontalAccumulator = useRef(0);
  const lastSwipeTime = useRef(0);

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

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setMainWidth(el.offsetWidth));
    ro.observe(el);
    setMainWidth(el.offsetWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const measure = () => {
      if (calendarRef.current) {
        setContentLeft(calendarRef.current.getBoundingClientRect().left);
      }
      setViewportWidth(window.innerWidth);
    };
    measure();
    window.addEventListener("resize", measure);
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    return () => { window.removeEventListener("resize", measure); ro.disconnect(); };
  }, []);

  const prev = useCallback(() => {
    setDirection(-1);
    setFocusedDate(d => {
      switch (view) {
        case "year":
        case "year-months": return subYears(d, 1);
        case "month":       return subMonths(d, 1);
        case "week":        return subWeeks(d, 1);
      }
    });
  }, [view]);

  const next = useCallback(() => {
    setDirection(1);
    setFocusedDate(d => {
      switch (view) {
        case "year":
        case "year-months": return addYears(d, 1);
        case "month":       return addMonths(d, 1);
        case "week":        return addWeeks(d, 1);
      }
    });
  }, [view]);

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
      if (e.ctrlKey) {
        e.preventDefault();
        const now = Date.now();
        if (now - lastZoomTime.current < 300) return;
        lastZoomTime.current = now;
        if (e.deltaY < 0) zoomIn();
        else zoomOut();
        return;
      }
      // Horizontal swipe: accumulate and fire once past threshold
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
        horizontalAccumulator.current += e.deltaX;
        const now = Date.now();
        if (Math.abs(horizontalAccumulator.current) > 60 && now - lastSwipeTime.current > 300) {
          if (horizontalAccumulator.current > 0) next();
          else prev();
          horizontalAccumulator.current = 0;
          lastSwipeTime.current = now;
        }
      }
      // Vertical scroll (!ctrlKey, vertical dominant): let page scroll normally
    }
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [zoomIn, zoomOut, prev, next]);

  const prevAnchor = subMonths(focusedDate, 1);
  const nextAnchor = addMonths(focusedDate, 1);

  const peekWidth = Math.round(mainWidth * 0.8);
  const colWidth = Math.round(peekWidth / 7);
  const leftPeekLeft = contentLeft - peekWidth + colWidth;
  const rightPeekLeft = viewportWidth - colWidth;

  return (
    <div ref={calendarRef} className="mx-6 my-6">

      {/* Mode toggle */}
      <div className="mb-4 flex items-center justify-between">
        <div className="inline-flex rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setMode("calendar")}
            className={[
              "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
              mode === "calendar"
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-500 hover:text-gray-700",
            ].join(" ")}
          >
            Calendar
          </button>
          <button
            onClick={() => setMode("upcoming")}
            className={[
              "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
              mode === "upcoming"
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-500 hover:text-gray-700",
            ].join(" ")}
          >
            Upcoming
          </button>
        </div>
        {view === "year-months" && (
          <span className="text-2xl font-semibold text-gray-800">
            {focusedDate.getFullYear()}
          </span>
        )}
      </div>

      {/* Main view area */}
      {loading ? (
        <div className="text-sm text-gray-400">Loading calendar…</div>
      ) : (
        <>
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            dragDirectionLock
            style={{ userSelect: "none", touchAction: "pan-y" }}
            onDragEnd={(_, info) => {
              const isHorizontalDominant = Math.abs(info.offset.x) > Math.abs(info.offset.y);
              if (!isHorizontalDominant) return;
              if (info.offset.x < -80) next();
              else if (info.offset.x > 80) prev();
            }}
          >
          <div ref={mainRef} className="relative overflow-hidden z-10">
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
                  <UpcomingList events={events} />
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
                        onYearSelect={(year) => {
                          setDirection(year > focusedDate.getFullYear() ? 1 : -1);
                          setFocusedDate(d => {
                            const n = new Date(d);
                            n.setFullYear(year);
                            return n;
                          });
                        }}
                        onYearHover={(year) => setHoveredPeriod({ type: "year", value: year })}
                      />
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
          </motion.div>

          {view === "month" && (
            <>
              {/* Left peek: previous month — right edge sits one column inside content area */}
              <div
                style={{
                  position: "fixed",
                  left: leftPeekLeft,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: peekWidth,
                  zIndex: 5,
                  opacity: 0.25,
                  cursor: "pointer",
                  pointerEvents: "auto",
                }}
                onClick={prev}
                role="button"
                tabIndex={0}
                aria-label="Go to previous month"
                onKeyDown={(e) => e.key === "Enter" && prev()}
              >
                <MonthGrid
                  anchor={prevAnchor}
                  events={events}
                  showWeekNumbers={false}
                  compact={false}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-white/80 rounded-full p-1.5 shadow-sm">
                    <ChevronLeft size={18} className="text-gray-500" />
                  </div>
                </div>
              </div>

              {/* Right peek: next month — left edge sits one column before viewport right */}
              <div
                style={{
                  position: "fixed",
                  left: rightPeekLeft,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: peekWidth,
                  zIndex: 5,
                  opacity: 0.25,
                  cursor: "pointer",
                  pointerEvents: "auto",
                }}
                onClick={next}
                role="button"
                tabIndex={0}
                aria-label="Go to next month"
                onKeyDown={(e) => e.key === "Enter" && next()}
              >
                <MonthGrid
                  anchor={nextAnchor}
                  events={events}
                  showWeekNumbers={false}
                  compact={false}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-white/80 rounded-full p-1.5 shadow-sm">
                    <ChevronRight size={18} className="text-gray-500" />
                  </div>
                </div>
              </div>
            </>
          )}

          {view !== "year" && view !== "month" && <CalendarNavButtons onPrev={prev} onNext={next} />}
        </>
      )}

    </div>
  );
}
