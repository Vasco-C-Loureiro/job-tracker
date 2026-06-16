"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CalendarFeedEvent } from "@job-tracker/shared";

// Size and font scale by distance from the centre slot (index 3)
const SIZES = [
  { w: 160, h: 160, fontSize: "1.875rem" }, // dist 0 — focused
  { w: 144, h: 144, fontSize: "1.5rem"   }, // dist 1
  { w: 130, h: 130, fontSize: "1.25rem"  }, // dist 2
  { w: 116, h: 116, fontSize: "1.125rem" }, // dist 3 — peeking edge
];

interface YearViewProps {
  focusedDate: Date;
  events: CalendarFeedEvent[];
  onYearClick?: (year: number) => void;   // called when the FOCUSED year is clicked → zoom in
  onYearSelect?: (year: number) => void;  // called when a non-focused year is clicked → centre it
  onYearHover?: (year: number) => void;
}

export function YearView({ focusedDate, events: _events, onYearClick, onYearSelect, onYearHover }: YearViewProps) {
  const focusedYear = focusedDate.getFullYear();
  const currentYear = new Date().getFullYear();

  // 7 years: focused ± 3; indices 0 and 6 are the peeking ones
  const years = Array.from({ length: 7 }, (_, i) => focusedYear - 3 + i);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="relative overflow-hidden w-full">
        {/*
          Track centred so the focused year (index 3 of 7) is in the middle.
          Each layout slot is w-40 (160px) with gap-4 (1rem).
          Offset = -(3 * (160px + 1rem)) + 50% - 80px to centre slot 3.
          The visual card inside each slot animates independently.
        */}
        <div
          className="flex gap-4"
          style={{ transform: "translateX(calc(-3 * (160px + 1rem) + 50% - 80px))" }}
        >
          {years.map((year, idx) => {
            const isPeeking = idx === 0 || idx === 6;
            const isFocused = year === focusedYear;
            const isToday   = year === currentYear;
            const dist      = Math.abs(idx - 3);
            const { w, h, fontSize } = SIZES[dist];

            return (
              // Fixed-size layout slot keeps the track centering stable
              <div key={year} className="flex-shrink-0 w-40 h-40 flex items-center justify-center">
                <motion.div
                  initial={{ width: w, height: h }}
                  animate={{ width: w, height: h }}
                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                  onClick={() => {
                    if (isFocused) onYearClick?.(year);
                    else onYearSelect?.(year);
                  }}
                  role="button"
                  tabIndex={0}
                  onMouseEnter={() => onYearHover?.(year)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    if (isFocused) onYearClick?.(year);
                    else onYearSelect?.(year);
                  }}
                  className={[
                    "relative rounded-xl flex flex-col items-center justify-center cursor-pointer select-none overflow-hidden",
                    isFocused  ? "bg-blue-50"                                      : "bg-white border border-gray-200 hover:border-gray-300",
                    isPeeking  ? "opacity-60 hover:opacity-80"                     : "",
                  ].filter(Boolean).join(" ")}
                >
                  {/* Corner bracket highlight for the focused year */}
                  {isFocused && (
                    <>
                      <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue-400 rounded-tl-sm" />
                      <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-blue-400 rounded-tr-sm" />
                      <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-blue-400 rounded-bl-sm" />
                      <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-blue-400 rounded-br-sm" />
                    </>
                  )}

                  {/* Directional hints on the edge peeking squares */}
                  {idx === 0 && (
                    <ChevronLeft size={14} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400" />
                  )}
                  {idx === 6 && (
                    <ChevronRight size={14} className="absolute left-1 top-1/2 -translate-y-1/2 text-gray-400" />
                  )}

                  <span
                    style={{
                      fontSize,
                      transition: "font-size 0.25s cubic-bezier(0.4,0,0.2,1)",
                    }}
                    className={`font-semibold ${isFocused ? "text-blue-700" : "text-gray-700"}`}
                  >
                    {year}
                  </span>
                  {isToday && !isFocused && (
                    <span className="mt-1 text-xs text-blue-400">current</span>
                  )}
                  {isToday && isFocused && (
                    <span className="mt-1 text-xs text-blue-500">this year</span>
                  )}
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
