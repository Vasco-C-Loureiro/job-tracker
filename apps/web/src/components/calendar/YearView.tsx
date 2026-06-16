"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CalendarFeedEvent } from "@job-tracker/shared";

// Size and font scale by distance from the centre slot (index 3)
const SIZES = [
  { w: 210, h: 210, fontSize: "2.25rem"  }, // dist 0 — focused
  { w: 175, h: 175, fontSize: "1.5rem"   }, // dist 1
  { w: 155, h: 155, fontSize: "1.25rem"  }, // dist 2
  { w: 132, h: 132, fontSize: "1.125rem" }, // dist 3 — peeking edge
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
          Each layout slot is 210px with gap-4 (1rem).
          Offset = -(3 * (210px + 1rem)) + 50% - 105px to centre slot 3.
          The visual card inside each slot animates to its target size.
        */}
        <div
          className="flex gap-4"
          style={{ transform: "translateX(calc(-3 * (210px + 1rem) + 50% - 105px))" }}
        >
          {years.map((year, idx) => {
            const isPeeking = idx === 0 || idx === 6;
            const isFocused = year === focusedYear;
            const isToday   = year === currentYear;
            const dist      = Math.abs(idx - 3);
            const { w, h, fontSize } = SIZES[dist];

            const square = (
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
                  isFocused ? "bg-blue-50"                                    : "bg-white border border-gray-200 hover:border-gray-300",
                  isPeeking ? "opacity-60 hover:opacity-80"                   : "",
                ].filter(Boolean).join(" ")}
              >
                {/* Side-rail + corner-nub border for the focused year */}
                {isFocused && (
                  <>
                    <div className="absolute left-0 top-0 bottom-0 border-l-2 border-blue-400 rounded-l" />
                    <div className="absolute right-0 top-0 bottom-0 border-r-2 border-blue-400 rounded-r" />
                    <div className="absolute left-0 top-0 w-3 border-t-2 border-blue-400" />
                    <div className="absolute right-0 top-0 w-3 border-t-2 border-blue-400" />
                    <div className="absolute left-0 bottom-0 w-3 border-b-2 border-blue-400" />
                    <div className="absolute right-0 bottom-0 w-3 border-b-2 border-blue-400" />
                  </>
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
            );

            return (
              // Fixed-size layout slot keeps the track centering stable
              <div key={year} className="flex-shrink-0 w-[210px] h-[210px] flex items-center justify-center">
                {idx === 0 ? (
                  <div className="flex items-center gap-2 justify-center">
                    <ChevronLeft size={22} className="text-gray-400 flex-shrink-0" />
                    {square}
                  </div>
                ) : idx === 6 ? (
                  <div className="flex items-center gap-2 justify-center">
                    {square}
                    <ChevronRight size={22} className="text-gray-400 flex-shrink-0" />
                  </div>
                ) : (
                  square
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
