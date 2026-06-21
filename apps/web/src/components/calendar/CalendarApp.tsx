"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { addYears, subYears, addMonths, subMonths, addWeeks, subWeeks, format, startOfWeek, getISOWeek } from "date-fns";
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

const SWIPE_THRESHOLD = 50;
const SWIPE_COOLDOWN_MS = 350;
const SWIPE_MAX_PER_GESTURE = 5;
const SWIPE_GESTURE_RESET_MS = 1000;
const ZOOM_COOLDOWN_MS = 400;
const ZOOM_NEW_THRESHOLD = 50;

const slideVariants = {
  enter: ({ direction, type }: { direction: number; type: string }) => {
    if (type === 'zoom-in')  return { scale: 0.75, x: 0, opacity: 0 };
    if (type === 'zoom-out') return { scale: 1.25, x: 0, opacity: 0 };
    return { scale: 1, x: direction > 0 ? '25%' : '-25%', opacity: 0 };
  },
  centre: {
    x: 0,
    scale: 1,
    opacity: 1,
    transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] as const },
  },
  exit: ({ direction, type }: { direction: number; type: string }) => {
    if (type === 'zoom-in')
      return { scale: 1.25, x: 0, opacity: 0,
               transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] as const } };
    if (type === 'zoom-out')
      return { scale: 0.75, x: 0, opacity: 0,
               transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] as const } };
    return { scale: 1, x: direction > 0 ? '-25%' : '25%', opacity: 0,
             transition: { duration: 0.22, ease: [0.4, 0, 1, 1] as const } };
  },
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
  const [transitionType, setTransitionType] = useState<'slide' | 'zoom-in' | 'zoom-out'>('slide');
  const calendarRef = useRef<HTMLDivElement>(null);
  const lastZoomTime = useRef(0);
  const horizontalAccumulator = useRef(0);
  const lastSwipeTime = useRef(0);
  const swipeNavCount = useRef(0);
  const peakDeltaX = useRef(0);
  const lastSwipeEventTime = useRef(0);
  const zoomAccumulator = useRef(0);
  const zoomDirection = useRef<0 | 1 | -1>(0);

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

  const prev = useCallback(() => {
    setTransitionType('slide');
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
    setTransitionType('slide');
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
    setTransitionType('zoom-in');
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
    setTransitionType('zoom-out');
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
        const dir = e.deltaY < 0 ? -1 : 1;
        if (dir !== zoomDirection.current) {
          zoomAccumulator.current = 0;
          zoomDirection.current = dir;
        }
        zoomAccumulator.current += Math.abs(e.deltaY);
        const now = Date.now();
        if (
          now - lastZoomTime.current >= ZOOM_COOLDOWN_MS &&
          zoomAccumulator.current >= ZOOM_NEW_THRESHOLD
        ) {
          if (e.deltaY < 0) zoomIn();
          else zoomOut();
          lastZoomTime.current = now;
          zoomAccumulator.current = 0;
        }
        return;
      }
      // Horizontal swipe: accumulate and fire once past threshold
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
        const now = Date.now();

        // Reset gesture state if idle long enough
        if (
          now - lastSwipeEventTime.current > SWIPE_GESTURE_RESET_MS ||
          (swipeNavCount.current > 0 && now - lastSwipeTime.current > SWIPE_GESTURE_RESET_MS)
        ) {
          swipeNavCount.current = 0;
          horizontalAccumulator.current = 0;
          peakDeltaX.current = 0;
        }
        lastSwipeEventTime.current = now;

        // Track the highest per-event deltaX seen in this gesture (velocity signal)
        peakDeltaX.current = Math.max(peakDeltaX.current, Math.abs(e.deltaX));

        // Fast flick (high per-event velocity) → cap at 1 navigation
        // Slow/medium swipe → allow up to SWIPE_MAX_PER_GESTURE
        const maxForGesture = peakDeltaX.current > 12 ? 1 : SWIPE_MAX_PER_GESTURE;

        horizontalAccumulator.current += e.deltaX;

        if (
          Math.abs(horizontalAccumulator.current) >= SWIPE_THRESHOLD &&
          swipeNavCount.current < maxForGesture &&
          now - lastSwipeTime.current >= SWIPE_COOLDOWN_MS
        ) {
          const dir = horizontalAccumulator.current > 0 ? 1 : -1;
          if (dir > 0) next();
          else prev();
          horizontalAccumulator.current -= dir * SWIPE_THRESHOLD;
          swipeNavCount.current++;
          lastSwipeTime.current = now;
        }
      }
      // Vertical scroll (!ctrlKey, vertical dominant): let page scroll normally
    }
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [zoomIn, zoomOut, prev, next]);

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
          <div className="inline-flex rounded-lg bg-gray-100 p-1">
            <button
              onClick={zoomOut}
              className="px-4 py-1.5 rounded-md text-sm font-medium transition-colors bg-white shadow-sm text-gray-900 hover:bg-gray-50"
              aria-label="Zoom out to year view"
            >
              <span className="text-lg font-semibold">{focusedDate.getFullYear()}</span>
            </button>
          </div>
        )}
        {view === "month" && (
          <div className="inline-flex rounded-lg bg-gray-100 p-1">
            <button
              onClick={zoomOut}
              className="px-4 py-1.5 rounded-md text-sm font-medium transition-colors bg-white shadow-sm text-gray-900 hover:bg-gray-50"
              aria-label="Zoom out to year-months view"
            >
              <span className="text-sm font-semibold">{format(focusedDate, "MMMM yyyy")}</span>
            </button>
          </div>
        )}
        {view === "week" && (
          <div className="inline-flex rounded-lg bg-gray-100 p-1">
            <button
              onClick={zoomOut}
              className="px-4 py-1.5 rounded-md text-sm font-medium transition-colors bg-white shadow-sm text-gray-900 hover:bg-gray-50"
              aria-label="Zoom out to month view"
            >
              <span className="text-sm font-semibold">
                {(() => {
                  const weekStart = startOfWeek(focusedDate, { weekStartsOn: 1 });
                  return `Week ${getISOWeek(weekStart)}, ${format(weekStart, "MMMM yyyy")}`;
                })()}
              </span>
            </button>
          </div>
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
            dragElastic={0.4}
            dragDirectionLock
            style={{ userSelect: "none", touchAction: "pan-y" }}
            onDragEnd={(_, info) => {
              const isHorizontalDominant = Math.abs(info.offset.x) > Math.abs(info.offset.y);
              if (!isHorizontalDominant) return;
              if (info.offset.x < -80) next();
              else if (info.offset.x > 80) prev();
            }}
          >
          <div className="relative overflow-hidden z-10 -mx-6">
            <AnimatePresence mode="popLayout" custom={{ direction, type: transitionType }}>
              <motion.div
                key={`${view}-${focusedDate.getFullYear()}-${focusedDate.getMonth()}-${Math.floor(focusedDate.getDate() / 7)}`}
                custom={{ direction, type: transitionType }}
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
                          setTransitionType('zoom-in');
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
                          setTransitionType('zoom-in');
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
                          setTransitionType('zoom-in');
                          setFocusedDate(prev => {
                            const d = new Date(prev);
                            d.setFullYear(year);
                            return d;
                          });
                          setView("year-months");
                        }}
                        onYearSelect={(year) => {
                          setTransitionType('slide');
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

          {view !== "year" && view !== "month" && <CalendarNavButtons onPrev={prev} onNext={next} />}
        </>
      )}

    </div>
  );
}
