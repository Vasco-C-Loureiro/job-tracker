"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, animate } from "framer-motion";
import { CornerUpRight, ChevronDown } from "lucide-react";
import { startOfWeek, getMonth, getYear } from "date-fns";
import type { CalendarView } from "@job-tracker/shared";

const MONTH_LABELS = [
  "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec",
];

const SLOT_H = 36;
const ABOVE  = 2;
const VISIBLE = 12; // 2 above + 1 centre + 9 below
const DRUM_H  = VISIBLE * SLOT_H; // 432px

function yForIdx(i: number) {
  return (ABOVE - i) * SLOT_H;
}

function slotTextColor(absDist: number): string {
  if (absDist === 0) return "#111111";
  if (absDist === 1) return "#555555";
  if (absDist === 2) return "#888888";
  if (absDist === 3) return "#aaaaaa";
  return "#cccccc";
}

// ── DrumColumn ────────────────────────────────────────────────────────────────

interface DrumColumnProps {
  items: string[];
  selectedIndex: number;
  loop: boolean;
  onSnap: (idx: number) => void;
  onDragUpdate: (idx: number) => void;
}

function DrumColumn({ items, selectedIndex, loop, onSnap, onDragUpdate }: DrumColumnProps) {
  const N = items.length;
  const COPIES = loop ? 3 : 1;
  const TOTAL  = N * COPIES;

  const initialGlobal = loop ? selectedIndex + N : selectedIndex;
  const y = useMotionValue(yForIdx(initialGlobal));
  const [centeredGlobal, setCenteredGlobal] = useState(initialGlobal);
  const isDragging = useRef(false);

  // Sync position when selectedIndex changes from outside (e.g. swipe navigation)
  useEffect(() => {
    if (!isDragging.current) {
      const g = loop ? selectedIndex + N : selectedIndex;
      y.set(yForIdx(g));
      setCenteredGlobal(g);
    }
  }, [selectedIndex, loop, N, y]);

  function getCenteredGlobal(yVal: number): number {
    const raw = Math.round((ABOVE * SLOT_H - yVal) / SLOT_H);
    return Math.max(0, Math.min(TOTAL - 1, raw));
  }

  function getItemIdx(g: number): number {
    return ((g % N) + N) % N;
  }

  function handleDrag() {
    const g = getCenteredGlobal(y.get());
    setCenteredGlobal(g);
    onDragUpdate(getItemIdx(g));
  }

  function handleDragEnd() {
    const g       = getCenteredGlobal(y.get());
    const itemIdx = getItemIdx(g);

    if (loop) {
      const snapY   = yForIdx(g);
      const middleY = yForIdx(itemIdx + N);
      animate(y, snapY, {
        duration: 0.15,
        ease: "easeOut",
        onComplete: () => {
          isDragging.current = false;
          y.set(middleY);
          setCenteredGlobal(itemIdx + N);
        },
      });
    } else {
      animate(y, yForIdx(g), {
        duration: 0.15,
        ease: "easeOut",
        onComplete: () => { isDragging.current = false; },
      });
    }

    onSnap(itemIdx);
  }

  const constraintTop    = yForIdx(TOTAL - 1);
  const constraintBottom = yForIdx(0);

  const renderItems: { label: string; globalIdx: number }[] = [];
  for (let c = 0; c < COPIES; c++) {
    for (let i = 0; i < N; i++) {
      renderItems.push({ label: items[i], globalIdx: c * N + i });
    }
  }

  return (
    <div
      className="relative overflow-hidden flex-1"
      style={{
        height: DRUM_H,
        maskImage:
          `linear-gradient(to bottom, transparent 0px, rgba(0,0,0,1) ${ABOVE * SLOT_H}px, rgba(0,0,0,1) 100%)`,
        WebkitMaskImage:
          `linear-gradient(to bottom, transparent 0px, rgba(0,0,0,1) ${ABOVE * SLOT_H}px, rgba(0,0,0,1) 100%)`,
      }}
    >
      <motion.div
        style={{ y }}
        drag="y"
        dragConstraints={{ top: constraintTop, bottom: constraintBottom }}
        dragElastic={0.05}
        onDragStart={() => { isDragging.current = true; }}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
      >
        {renderItems.map(({ label, globalIdx }) => {
          const dist    = globalIdx - centeredGlobal;
          const absDist = Math.abs(dist);
          return (
            <div
              key={globalIdx}
              className="select-none"
              style={{
                display:         "flex",
                alignItems:      "center",
                justifyContent:  "center",
                height:          SLOT_H,
                color:           slotTextColor(absDist),
                fontWeight:      dist === 0 ? 600 : 400,
                borderRadius:    dist === 0 ? 6 : 0,
                backgroundColor: dist === 0 ? "#e5e7eb" : "transparent",
                position:        "relative",
                zIndex:          30,
              }}
            >
              {label}
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}

// ── CalendarDrumPicker ────────────────────────────────────────────────────────

interface CalendarDrumPickerProps {
  view:        CalendarView;
  focusedDate: Date;
  onNavigate:  (date: Date) => void;
  onZoomOut:   () => void;
}

export function CalendarDrumPicker({
  view,
  focusedDate,
  onNavigate,
  onZoomOut,
}: CalendarDrumPickerProps) {
  const currentMonth = getMonth(focusedDate);
  const currentYear  = getYear(focusedDate);

  const [isOpen,       setIsOpen]       = useState(false);
  const [displayMonth, setDisplayMonth] = useState(currentMonth);
  const [displayYear,  setDisplayYear]  = useState(currentYear);
  const containerRef = useRef<HTMLDivElement>(null);
  // Fixed base year for the year column — never shifts as focusedDate changes
  const [initBaseYear] = useState(() => currentYear - 30);

  // Keep pill label in sync when focusedDate changes while picker is closed
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (wasOpenRef.current && !isOpen) {
      setTimeout(() => {
        setDisplayMonth(getMonth(focusedDate));
        setDisplayYear(getYear(focusedDate));
      }, 0);
    }
    wasOpenRef.current = isOpen;
  }, [focusedDate, isOpen]);

  // Escape closes drum
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  // Click outside closes drum
  useEffect(() => {
    if (!isOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isOpen]);

  // Year view has its own navigation — drum not needed
  if (view === "year") return null;

  const showMonth       = view !== "year-months";
  const yearItems       = Array.from({ length: 61 }, (_, i) => String(initBaseYear + i));
  const yearSelectedIdx = Math.max(0, Math.min(60, currentYear - initBaseYear));

  const pillLabel = showMonth
    ? `${MONTH_LABELS[displayMonth]} ${displayYear}`
    : `${displayYear}`;

  function computeTarget(month: number, year: number): Date {
    if (view === "year-months") return new Date(year, 0, 1);
    if (view === "week")        return startOfWeek(new Date(year, month, 1), { weekStartsOn: 1 });
    return new Date(year, month, 1);
  }

  function navigate(month: number, year: number) {
    onNavigate(computeTarget(month, year));
  }

  function handleMonthSnap(idx: number) {
    setDisplayMonth(idx);
    navigate(idx, displayYear);
  }

  function handleYearSnap(idx: number) {
    const year = initBaseYear + idx;
    setDisplayYear(year);
    navigate(displayMonth, year);
  }

  return (
    <div ref={containerRef} className="relative flex items-center gap-2">
      {/* Zoom-out */}
      <button
        onClick={onZoomOut}
        className="flex items-center justify-center w-7 h-7 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-neutral-600 dark:hover:text-neutral-300 transition-colors"
        aria-label="Zoom out"
      >
        <CornerUpRight size={16} style={{ transform: 'rotate(-90deg)' }} />
      </button>

      {/* Pill trigger */}
      <div className="inline-flex rounded-lg bg-gray-100 p-1">
        <button
          onClick={() => setIsOpen(v => !v)}
          className="px-4 py-1.5 rounded-md text-sm font-medium bg-white shadow-sm text-gray-900 hover:bg-gray-50 transition-colors inline-flex items-center gap-1.5"
          aria-expanded={isOpen}
          aria-label="Open date picker"
        >
          {pillLabel}
          <ChevronDown size={14} className="text-gray-400" />
        </button>
      </div>

      {/* Drum panel — centred under the pill */}
      <AnimatePresence>
        {isOpen && (
          <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 z-50">
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0,  scale: 1    }}
              exit={{    opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="bg-neutral-50 border border-neutral-200 rounded-xl shadow-xl overflow-hidden flex"
              style={{ width: showMonth ? 220 : 110 }}
            >
              {showMonth && (
                <>
                  <DrumColumn
                    items={MONTH_LABELS}
                    selectedIndex={currentMonth}
                    loop={true}
                    onSnap={handleMonthSnap}
                    onDragUpdate={(idx) => setDisplayMonth(idx)}
                  />
                  <div className="w-px bg-neutral-200 flex-shrink-0 z-20" />
                </>
              )}

              <DrumColumn
                items={yearItems}
                selectedIndex={yearSelectedIdx}
                loop={false}
                onSnap={handleYearSnap}
                onDragUpdate={(idx) => setDisplayYear(initBaseYear + idx)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
