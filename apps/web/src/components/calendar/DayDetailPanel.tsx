"use client";

import { useEffect } from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import type { CalendarFeedEvent, InterviewType } from "@job-tracker/shared";
import { resolveColorKey, colorClasses } from "@/lib/calendar/colors";
import { INTERVIEW_TYPE_ICONS } from "@/lib/calendar/icons";

interface DayDetailPanelProps {
  day: Date;
  events: CalendarFeedEvent[];
  onClose: () => void;
}

function formatTimeRange(time: string | null, endTime: string | null): string | null {
  if (!time) return null;
  const start = time.slice(0, 5);
  const end = endTime?.slice(0, 5);
  return end ? `${start} – ${end}` : start;
}

const SOURCE_LABELS: Record<string, string> = {
  interview_round: "Interview",
  deadline:        "Deadline",
  applied:         "Applied",
  manual:          "Manual",
};

export function DayDetailPanel({ day, events, onClose }: DayDetailPanelProps) {
  const dayStr = format(day, "yyyy-MM-dd");

  const dayEvents = events
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.date === dayStr)
    .sort((a, b) => {
      if (a.e.time === null && b.e.time === null) return a.i - b.i;
      if (a.e.time === null) return 1;
      if (b.e.time === null) return -1;
      const cmp = a.e.time.localeCompare(b.e.time);
      return cmp !== 0 ? cmp : a.i - b.i;
    })
    .map(({ e }) => e);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-neutral-900 shadow-xl z-50 flex flex-col"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-neutral-700">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-neutral-100">
            {format(day, "EEEE d MMMM yyyy")}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-neutral-500 dark:hover:text-neutral-300 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {dayEvents.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-gray-400">No events for this day.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {dayEvents.map(event => {
                const token = resolveColorKey(event);
                const dotClass = colorClasses(token, "dot");
                const timeRange = formatTimeRange(event.time, event.endTime);

                return (
                  <div key={event.id} className="flex gap-3 items-start">
                    {/* Colour chip */}
                    <span className={`mt-1 w-3 h-3 rounded-sm flex-shrink-0 ${dotClass}`} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          {timeRange && (
                            <p className="text-xs text-gray-400 mb-0.5">{timeRange}</p>
                          )}
                          <p className="text-sm font-medium text-gray-800 dark:text-neutral-100">
                            {event.title}
                          </p>
                        </div>
                        {/* Source badge */}
                        <span className="flex-shrink-0 text-xs text-gray-400 bg-gray-100 dark:bg-neutral-800 dark:text-neutral-400 rounded px-1.5 py-0.5">
                          {SOURCE_LABELS[event.source] ?? event.source}
                        </span>
                      </div>

                      {/* Round type + number */}
                      {event.source === "interview_round" && event.roundType && (
                        <div className="flex items-center gap-1.5 mt-1">
                          {(() => {
                            const Icon = INTERVIEW_TYPE_ICONS[event.roundType as InterviewType] ?? INTERVIEW_TYPE_ICONS.other;
                            return <Icon size={14} className="flex-shrink-0 text-gray-400" />;
                          })()}
                          {event.roundNumber !== null && (
                            <span className="text-xs text-gray-500 dark:text-neutral-400">
                              Round {event.roundNumber}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Description */}
                      {event.description && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-3">
                          {event.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
