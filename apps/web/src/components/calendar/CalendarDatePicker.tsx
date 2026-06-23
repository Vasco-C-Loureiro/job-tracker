"use client";

import { startOfMonth, startOfWeek, setMonth, setYear, getMonth, getYear } from "date-fns";
import type { CalendarView } from "@job-tracker/shared";

interface CalendarDatePickerProps {
  view: CalendarView;
  focusedDate: Date;
  onChange: (date: Date) => void;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function CalendarDatePicker({ view, focusedDate, onChange }: CalendarDatePickerProps) {
  if (view === "year") return null;

  const currentYear = getYear(focusedDate);
  const currentMonth = getMonth(focusedDate);
  const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);

  const selectClass =
    "text-sm bg-transparent border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1 text-gray-700 dark:text-neutral-200 focus:outline-none focus:border-blue-400 cursor-pointer";

  function computeTarget(year: number, month: number): Date {
    const withYearMonth = setMonth(setYear(focusedDate, year), month);
    if (view === "week") {
      return startOfWeek(startOfMonth(withYearMonth), { weekStartsOn: 1 });
    }
    return startOfMonth(withYearMonth);
  }

  function handleMonthChange(e: React.ChangeEvent<HTMLSelectElement>) {
    onChange(computeTarget(currentYear, parseInt(e.target.value, 10)));
  }

  function handleYearChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newYear = parseInt(e.target.value, 10);
    if (view === "year-months") {
      onChange(startOfMonth(setYear(focusedDate, newYear)));
    } else {
      onChange(computeTarget(newYear, currentMonth));
    }
  }

  return (
    <div className="flex items-center gap-2">
      {(view === "month" || view === "week") && (
        <select
          className={selectClass}
          value={currentMonth}
          onChange={handleMonthChange}
          aria-label="Jump to month"
        >
          {MONTHS.map((name, idx) => (
            <option key={idx} value={idx}>{name}</option>
          ))}
        </select>
      )}
      <select
        className={selectClass}
        value={currentYear}
        onChange={handleYearChange}
        aria-label="Jump to year"
      >
        {years.map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
}
