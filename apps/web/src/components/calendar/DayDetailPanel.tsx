"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Pencil, Trash2, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { CalendarFeedEvent, InterviewType } from "@job-tracker/shared";
import { resolveColorKey, colorClasses, MANUAL_COLOR_OPTIONS } from "@/lib/calendar/colors";
import { INTERVIEW_TYPE_ICONS } from "@/lib/calendar/icons";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { formatSalary } from "@/lib/formatSalary";
import { ManualEventForm } from "./ManualEventForm";
import type { ManualEventFormValues } from "./ManualEventForm";

interface DayDetailPanelProps {
  day: Date;
  events: CalendarFeedEvent[];
  onClose: () => void;
  onEventsChanged: () => void;
  defaultCurrency: string;
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

const INTEREST_LEVEL_CLASSES: Record<string, string> = {
  "low":       "bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-100",
  "medium":    "bg-yellow-100 text-yellow-700 dark:bg-yellow-700 dark:text-yellow-100",
  "high":      "bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100",
  "very-high": "bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-100",
};

const INTEREST_LEVEL_LABELS: Record<string, string> = {
  "low": "Low", "medium": "Medium", "high": "High", "very-high": "Very high",
};

// ─── Inline date/time editor for interview round events ───────────────────────

interface InterviewDateTimeEditorProps {
  event: CalendarFeedEvent;
  onEventsChanged: () => void;
}

function InterviewDateTimeEditor({ event, onEventsChanged }: InterviewDateTimeEditorProps) {
  const [dateVal, setDateVal] = useState(event.date);
  const [timeVal, setTimeVal] = useState(event.time?.slice(0, 5) ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const originalTime = event.time?.slice(0, 5) ?? "";

  async function handleBlur() {
    if (dateVal === event.date && timeVal === originalTime) return;
    setSaving(true);
    setError(null);
    try {
      const { data: { session } } = await createSupabaseBrowserClient().auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");
      const res = await fetch(`/api/interviews/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          roundNumber: event.roundNumber,
          type: event.roundType,
          date: dateVal,
          time: timeVal || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      onEventsChanged();
    } catch {
      setError("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const ic = "border border-neutral-200 dark:border-neutral-600 rounded px-2 py-1 text-xs text-neutral-800 dark:text-neutral-100 focus:outline-none focus:border-blue-400 disabled:opacity-50 bg-white";
  const lc = "block text-xs text-neutral-500 dark:text-neutral-400 mb-0.5";

  return (
    <div className="mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-600">
      <div className="flex gap-3 flex-wrap">
        <div>
          <label className={lc}>Date</label>
          <input
            type="date"
            className={ic}
            value={dateVal}
            onChange={(e) => setDateVal(e.target.value)}
            onBlur={() => void handleBlur()}
            disabled={saving}
          />
        </div>
        <div>
          <label className={lc}>Time (optional)</label>
          <input
            type="time"
            className={ic}
            value={timeVal}
            onChange={(e) => setTimeVal(e.target.value)}
            onBlur={() => void handleBlur()}
            disabled={saving}
          />
        </div>
      </div>
      {saving && <p className="text-xs text-neutral-500 mt-1.5">Saving…</p>}
      {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function DayDetailPanel({ day, events, onClose, onEventsChanged, defaultCurrency }: DayDetailPanelProps) {
  const dayStr = format(day, "yyyy-MM-dd");
  const [showForm, setShowForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [expandedRoundIds, setExpandedRoundIds] = useState<Record<string, boolean>>({});

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
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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

  async function handleUpdate(id: string, values: ManualEventFormValues) {
    const { data: { session } } = await createSupabaseBrowserClient().auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error("Not authenticated");

    const descParts: string[] = [];
    if (values.label.trim()) descParts.push(`label:${values.label.trim()}`);
    if (values.description.trim()) descParts.push(values.description.trim());
    const description = descParts.length > 0 ? descParts.join("\n") : null;

    const res = await fetch(`/api/calendar-events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: values.title.trim(),
        date: values.date,
        time: values.time || null,
        endTime: values.endTime || null,
        description,
        color: values.color || null,
      }),
    });

    if (!res.ok) throw new Error("Failed to update event");
    onEventsChanged();
    setEditingEventId(null);
  }

  async function handleDelete(id: string) {
    const { data: { session } } = await createSupabaseBrowserClient().auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error("Not authenticated");

    setIsDeleting(true);
    setDeleteError(null);

    const res = await fetch(`/api/calendar-events/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    setIsDeleting(false);

    if (!res.ok) {
      setDeleteError("Failed to delete. Please try again.");
      return;
    }

    onEventsChanged();
    setDeletingEventId(null);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/5 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        className="fixed right-0 top-0 h-full w-96 bg-neutral-50 shadow-xl z-50 flex flex-col"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-600">
          <h2 className="text-sm font-semibold text-neutral-900">
            {format(day, "EEEE d MMMM yyyy")}
          </h2>
          <div className="flex items-center gap-3">
            {!showForm && (
              <button
                onClick={() => { setShowForm(true); setEditingEventId(null); setDeletingEventId(null); }}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                <Plus size={14} />
                New event
              </button>
            )}
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 transition-colors"
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
              <p className="text-sm text-neutral-500">No events for this day.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {dayEvents.map(event => {
                const { label: manualLabel, body: manualBody } =
                  event.source === "manual"
                    ? parseManualDescription(event.description)
                    : { label: null, body: event.description };

                // Edit form replaces the row
                if (editingEventId === event.id) {
                  return (
                    <div key={event.id} className="border border-blue-100 rounded-lg p-3 bg-blue-50/30">
                      <ManualEventForm
                        initialDate={dayStr}
                        initialValues={{
                          title: event.title,
                          date: event.date,
                          time: event.time ?? "",
                          endTime: event.endTime ?? "",
                          color: event.color ?? MANUAL_COLOR_OPTIONS[0].key,
                          label: manualLabel ?? "",
                          description: manualBody ?? "",
                        }}
                        onSubmit={(values) => handleUpdate(event.id, values)}
                        onCancel={() => setEditingEventId(null)}
                        submitLabel="Save changes"
                      />
                    </div>
                  );
                }

                // Delete confirmation replaces the row
                if (deletingEventId === event.id) {
                  return (
                    <div key={event.id} className="border border-red-100 rounded-lg p-3 bg-red-50/30">
                      <p className="text-sm text-neutral-700 dark:text-neutral-200 mb-2">
                        Delete &ldquo;{event.title}&rdquo;?
                      </p>
                      {deleteError && (
                        <p className="text-xs text-red-600 mb-2">{deleteError}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => void handleDelete(event.id)}
                          disabled={isDeleting}
                          className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                          {isDeleting ? "Deleting…" : "Delete"}
                        </button>
                        <button
                          onClick={() => { setDeletingEventId(null); setDeleteError(null); }}
                          disabled={isDeleting}
                          className="px-3 py-1.5 text-sm text-neutral-600 hover:text-neutral-800 border border-neutral-200 rounded hover:bg-neutral-50 disabled:opacity-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                }

                // Normal row
                const colorToken = resolveColorKey(event);
                const dotClass = colorClasses(colorToken, "dot");
                const timeRange = formatTimeRange(event.time, event.endTime);
                const badgeText =
                  event.source === "manual"
                    ? (manualLabel ?? "Manual")
                    : (SOURCE_LABELS[event.source] ?? event.source);
                const bodyText = event.source === "manual" ? manualBody : event.description;
                const isExpanded = !!expandedRoundIds[event.id];

                return (
                  <div key={event.id} className="flex gap-3 items-start group">
                    {/* Colour chip */}
                    <span className={`mt-1 w-3 h-3 rounded-sm flex-shrink-0 ${dotClass}`} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          {/* Time shown above title only for non-interview events */}
                          {event.source !== "interview_round" && timeRange && (
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-0.5">{timeRange}</p>
                          )}
                          <p className="text-sm font-medium text-neutral-900 truncate">
                            {event.title}
                          </p>
                        </div>
                        {event.source !== "applied" && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {/* Manual event: edit + delete */}
                            {event.source === "manual" && (
                              <>
                                <button
                                  onClick={() => { setEditingEventId(event.id); setDeletingEventId(null); }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-400 hover:text-neutral-600 p-0.5 rounded"
                                  aria-label="Edit event"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={() => { setDeletingEventId(event.id); setEditingEventId(null); setDeleteError(null); }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-400 hover:text-red-500 p-0.5 rounded"
                                  aria-label="Delete event"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                            {/* Interview round: toggle date/time editor */}
                            {event.source === "interview_round" && (
                              <button
                                onClick={() => setExpandedRoundIds(prev => ({ ...prev, [event.id]: !prev[event.id] }))}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 p-0.5 rounded"
                                aria-label={isExpanded ? "Collapse" : "Edit date/time"}
                              >
                                {isExpanded ? <X size={14} /> : <Pencil size={14} />}
                              </button>
                            )}
                            <span className="text-xs text-neutral-500 bg-neutral-100 rounded px-1.5 py-0.5">
                              {badgeText}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Round type + number + time inline */}
                      {event.source === "interview_round" && event.roundType && (
                        <div className="flex items-center gap-1.5 mt-1">
                          {(() => {
                            const Icon = INTERVIEW_TYPE_ICONS[event.roundType as InterviewType] ?? INTERVIEW_TYPE_ICONS.other;
                            return <Icon size={14} className="flex-shrink-0 text-neutral-400" />;
                          })()}
                          <span className="text-xs text-neutral-500 dark:text-neutral-400">
                            {event.roundNumber !== null ? `Round ${event.roundNumber}` : ""}
                            {!isExpanded && timeRange ? ` · ${timeRange}` : ""}
                          </span>
                        </div>
                      )}

                      {/* Applied: job title + interest pill */}
                      {event.source === "applied" && (
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p className="text-xs text-neutral-500 truncate min-w-0 flex-1">
                            {event.jobTitle ?? ""}
                          </p>
                          {event.interestLevel && (
                            <span className={`flex-shrink-0 inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${INTEREST_LEVEL_CLASSES[event.interestLevel]}`}>
                              {event.interestLevel === "very-high"
                                ? "Very high"
                                : event.interestLevel.charAt(0).toUpperCase() +
                                  event.interestLevel.slice(1)}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Applied: salary on its own line */}
                      {event.source === "applied" && event.salary && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                          {formatSalary(event.salary, defaultCurrency)}
                        </p>
                      )}

                      {/* Description / notes body */}
                      {bodyText && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-3">{bodyText}</p>
                      )}

                      {/* Animated date/time editor for interview rounds */}
                      {event.source === "interview_round" && (
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              key="editor"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2, ease: "easeOut" }}
                              style={{ overflow: "hidden" }}
                            >
                              <InterviewDateTimeEditor
                                key={`${event.date}-${event.time ?? ""}`}
                                event={event}
                                onEventsChanged={onEventsChanged}
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      )}

                      {/* Go to interview link — always visible for interview rounds */}
                      {event.source === "interview_round" && (
                        <Link
                          href={`/interviews?highlight=${event.jobId}`}
                          className="mt-2 inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                        >
                          Go to interview <ArrowRight size={12} />
                        </Link>
                      )}

                      {/* Go to application link for applied events */}
                      {event.source === "applied" && event.jobId && (
                        <Link
                          href={`/?highlight=${event.jobId}`}
                          className="mt-2 inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                        >
                          Go to application <ArrowRight size={12} />
                        </Link>
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
