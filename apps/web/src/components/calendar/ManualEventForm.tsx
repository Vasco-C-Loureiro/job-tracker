"use client";

import { useState } from "react";
import { MANUAL_COLOR_OPTIONS, colorClasses } from "@/lib/calendar/colors";

export type ManualEventFormValues = {
  title: string;
  date: string;
  time: string;
  endTime: string;
  description: string;
  color: string;
  label: string;
};

interface ManualEventFormProps {
  initialDate: string;
  initialValues?: Partial<ManualEventFormValues>;
  onSubmit: (values: ManualEventFormValues) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
}

export function ManualEventForm({
  initialDate,
  initialValues,
  onSubmit,
  onCancel,
  submitLabel,
}: ManualEventFormProps) {
  const [title, setTitle]             = useState(initialValues?.title ?? "");
  const [label, setLabel]             = useState(initialValues?.label ?? "");
  const [date, setDate]               = useState(initialValues?.date ?? initialDate);
  const [time, setTime]               = useState(initialValues?.time ?? "");
  const [endTime, setEndTime]         = useState(initialValues?.endTime ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [color, setColor]             = useState(initialValues?.color ?? MANUAL_COLOR_OPTIONS[0].key);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState<string | null>(null);

  function validate(): string | null {
    if (!title.trim()) return "Title is required.";
    if (time && endTime && endTime <= time) return "End time must be after start time.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ title, date, time, endTime, description, color, label });
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const ic = "w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-blue-400 bg-white";
  const lc = "block text-xs font-medium text-gray-600 mb-1";

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
      <div>
        <label className={lc}>
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          className={ic}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Event title"
        />
      </div>

      <div>
        <label className={lc}>Type / label</label>
        <input
          type="text"
          className={ic}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Coffee chat, Deadline, Reminder"
        />
      </div>

      <div>
        <label className={lc}>
          Date <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          className={ic}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lc}>Start time</label>
          <input
            type="time"
            className={ic}
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
        <div>
          <label className={lc}>End time</label>
          <input
            type="time"
            className={ic}
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className={lc}>Notes</label>
        <textarea
          className={`${ic} resize-none`}
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional notes"
        />
      </div>

      <div>
        <label className={lc}>Colour</label>
        <div className="flex gap-2.5 mt-1">
          {MANUAL_COLOR_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setColor(option.key)}
              className={[
                "w-6 h-6 rounded-full transition-transform",
                colorClasses(option.key, "dot"),
                color === option.key
                  ? "ring-2 ring-offset-1 ring-gray-500 scale-110"
                  : "hover:scale-105 opacity-70",
              ].join(" ")}
              aria-label={option.label}
              title={option.label}
            />
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? "Saving…" : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
