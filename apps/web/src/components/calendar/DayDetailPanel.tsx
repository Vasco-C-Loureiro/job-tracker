"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { X, Plus } from "lucide-react";
import type { CalendarFeedEvent, InterviewType } from "@job-tracker/shared";
import { resolveColorKey, colorClasses } from "@/lib/calendar/colors";
import { INTERVIEW_TYPE_ICONS } from "@/lib/calendar/icons";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { ManualEventForm } from "./ManualEventForm";
import type { ManualEventFormValues } from "./ManualEventForm";

interface DayDetailPanelProps {
  day: Date;
  events: CalendarFeedEvent[];
  onClose: () => void;
  onEventsChanged: () => void;
}

function formatTimeRange(time: string | null, endTime: string | null): string | null {
  if (!time) return null;
  const start = time.slice(0, 5);
  const end = endTime?.slice(0, 5);
  return end ? `${start} – ${end}` : start;
}

function parseManualDescription(description: string | null): { label: string | null; body: string | null } {
  if (!description) return { label: null, body: null };
  if (description.startsWith("label:")) {
    const nl = description.indexOf("\n");
    if (nl === -1) return { label: description.slice(6), body: null };
    return { label: description.slice(6, nl), body: description.slice(nl + 1).trim() || null };
  }
  return { label: null, body: description };
}

const SOURCE_LABELS: Record<string, string> = {
  interview_round: "Interview",
  deadline:        "Deadline",
  applied:         "Applied",
  manual:          "Manual",
};

export function DayDetailPanel({ day, events, onClose, onEventsChanged }: DayDetailPanelProps) {
  const dayStr = format(day, "yyyy-MM-dd");
  const [showForm, setShowForm] = useState(false);

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

  async function handleCreate(values: ManualEventFormValues) {
    const { data: { session } } = await createSupabaseBrowserClient().auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error("Not authenticated");

    const descParts: string[] = [];
    if (values.label.trim()) descParts.push(`label:${values.label.trim()}`);
    if (values.description.trim()) descParts.push(values.description.trim());
    const description = descParts.length > 0 ? descParts.join("\n") : null;

    const res = await fetch("/api/calendar-events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: values.title.trim(),
        date: values.date,
        time: values.time || null,
        endTime: values.endTime || null,
        description,
        color: values.color || null,
      }),
    });

    if (!res.ok) throw new Error("Failed to create event");

    onEventsChanged();
    setShowForm(false);
  }

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
          <div className="flex items-center gap-3">
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                <Plus size={14} />
                New event
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:text-neutral-500 dark:hover:text-neutral-300 transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {showForm ? (
            <ManualEventForm
              initialDate={dayStr}
              onSubmit={handleCreate}
              onCancel={() => setShowForm(false)}
              submitLabel="Create event"
            />
          ) : dayEvents.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-gray-400">No events for this day.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {dayEvents.map(event => {
                const token = resolveColorKey(event);
                const dotClass = colorClasses(token, "dot");
                const timeRange = formatTimeRange(event.time, event.endTime);
                const { label: manualLabel, body: manualBody } =
                  event.source === "manual"
                    ? parseManualDescription(event.description)
                    : { label: null, body: event.description };
                const badgeText =
                  event.source === "manual"
                    ? (manualLabel ?? "Manual")
                    : (SOURCE_LABELS[event.source] ?? event.source);
                const bodyText = event.source === "manual" ? manualBody : event.description;

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
                          {badgeText}
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

                      {/* Description / notes body */}
                      {bodyText && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-3">{bodyText}</p>
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
