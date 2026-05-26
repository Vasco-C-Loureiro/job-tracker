"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type {
  JobApplicationListItem,
  ApplicationStatus,
  RemoteType,
  JobType,
} from "@job-tracker/shared";
import { parseSalary } from "@job-tracker/shared";

// ─── Types ───────────────────────────────────────────────────────────────────

type SortColumn =
  | "company"
  | "title"
  | "status"
  | "location"
  | "salary"
  | "savedAt";
type SortDirection = "asc" | "desc";
type SortState = { column: SortColumn; direction: SortDirection };

type InterestLevel = "low" | "medium" | "high" | "very-high";

type FilterState = {
  status: Set<ApplicationStatus>;
  interestLevel: Set<InterestLevel>;
  remoteType: Set<RemoteType>;
  jobType: Set<JobType>;
  source: Set<string>;
  salaryMin: number | null;
  salaryMax: number | null;
  includeUnspecifiedSalary: boolean;
  savedDateFrom: string | null;
  savedDateTo: string | null;
  tags: Set<string>;
  resumeSubmitted: "yes" | "no" | "either";
  coverLetterSubmitted: "yes" | "no" | "either";
};

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_ORDER: Record<ApplicationStatus, number> = {
  saved: 0,
  applied: 1,
  oa: 2,
  interview: 3,
  offer: 4,
  rejected: 5,
  ghosted: 6,
};

const DEFAULT_FILTERS: FilterState = {
  status: new Set(),
  interestLevel: new Set(),
  remoteType: new Set(),
  jobType: new Set(),
  source: new Set(),
  salaryMin: null,
  salaryMax: null,
  includeUnspecifiedSalary: true,
  savedDateFrom: null,
  savedDateTo: null,
  tags: new Set(),
  resumeSubmitted: "either",
  coverLetterSubmitted: "either",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSalary(n: number): string {
  return n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);
}

function countActiveFilters(f: FilterState): number {
  let n = 0;
  if (f.status.size > 0) n++;
  if (f.interestLevel.size > 0) n++;
  if (f.remoteType.size > 0) n++;
  if (f.jobType.size > 0) n++;
  if (f.source.size > 0) n++;
  if (f.salaryMin !== null || f.salaryMax !== null) n++;
  if (!f.includeUnspecifiedSalary) n++;
  if (f.savedDateFrom !== null || f.savedDateTo !== null) n++;
  if (f.tags.size > 0) n++;
  if (f.resumeSubmitted !== "either") n++;
  if (f.coverLetterSubmitted !== "either") n++;
  return n;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MultiPills<T extends string>({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { value: T; label: string }[];
  selected: Set<T>;
  onToggle: (value: T) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map(({ value, label: optLabel }) => (
          <button
            key={value}
            onClick={() => onToggle(value)}
            className={`px-3 py-1 rounded-full text-sm border transition-colors ${
              selected.has(value)
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-900 border-gray-300 hover:border-blue-400"
            }`}
          >
            {optLabel}
          </button>
        ))}
      </div>
    </div>
  );
}

function MultiDropdown<T extends string>({
  label,
  placeholder,
  options,
  selected,
  onToggle,
}: {
  label: string;
  placeholder: string;
  options: { value: T; label: string }[];
  selected: Set<T>;
  onToggle: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={ref}>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        {label}
      </p>
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md text-sm text-left hover:border-blue-400 focus:outline-none bg-white"
        >
          <span className="truncate text-gray-900">
            {selected.size === 0 ? placeholder : `${selected.size} selected`}
          </span>
          <span className="ml-2 text-gray-400 text-xs">{open ? "▲" : "▼"}</span>
        </button>
        {open && options.length > 0 && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
            {options.map(({ value, label: optLabel }) => (
              <label
                key={value}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-900 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.has(value)}
                  onChange={() => onToggle(value)}
                  className="shrink-0"
                />
                {optLabel}
              </label>
            ))}
          </div>
        )}
        {open && options.length === 0 && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg px-3 py-2 text-sm text-gray-400">
            No options
          </div>
        )}
      </div>
    </div>
  );
}

function ThreeWayToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: "yes" | "no" | "either";
  onChange: (v: "yes" | "no" | "either") => void;
}) {
  const options: { value: "yes" | "no" | "either"; label: string }[] = [
    { value: "yes", label: "Yes" },
    { value: "either", label: "Either" },
    { value: "no", label: "No" },
  ];
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        {label}
      </p>
      <div className="flex border border-gray-300 rounded-md overflow-hidden">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex-1 py-1.5 text-sm transition-colors ${
              value === opt.value
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-900 hover:bg-gray-50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SalarySlider({
  max,
  minVal,
  maxVal,
  includeUnspecified,
  onMinChange,
  onMaxChange,
  onIncludeUnspecifiedChange,
}: {
  max: number;
  minVal: number;
  maxVal: number;
  includeUnspecified: boolean;
  onMinChange: (v: number) => void;
  onMaxChange: (v: number) => void;
  onIncludeUnspecifiedChange: (v: boolean) => void;
}) {
  if (max === 0) {
    return (
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Salary
        </p>
        <p className="text-sm text-gray-400">No salary data in your jobs</p>
      </div>
    );
  }

  const step = Math.max(1000, Math.round(max / 100));
  const minPercent = (minVal / max) * 100;
  const maxPercent = (maxVal / max) * 100;

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Salary
      </p>
      <div className="relative h-5 mt-8 mb-3">
        {/* Min value bubble — floats above the min thumb */}
        <div
          className="absolute pointer-events-none flex flex-col items-center"
          style={{
            left: `${Math.max(2, Math.min(98, minPercent))}%`,
            bottom: "calc(100% + 4px)",
            transform: "translateX(-50%)",
          }}
        >
          <div className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
            {formatSalary(minVal)}
          </div>
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: "4px solid transparent",
              borderRight: "4px solid transparent",
              borderTop: "4px solid #2563eb",
            }}
          />
        </div>
        {/* Max value bubble — floats above the max thumb */}
        <div
          className="absolute pointer-events-none flex flex-col items-center"
          style={{
            left: `${Math.max(2, Math.min(98, maxPercent))}%`,
            bottom: "calc(100% + 4px)",
            transform: "translateX(-50%)",
          }}
        >
          <div className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
            {formatSalary(maxVal)}
          </div>
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: "4px solid transparent",
              borderRight: "4px solid transparent",
              borderTop: "4px solid #2563eb",
            }}
          />
        </div>
        {/* Track background */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 bg-gray-200 rounded" />
        {/* Active range fill */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1.5 bg-blue-500 rounded"
          style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }}
        />
        {/* Min input */}
        <input
          type="range"
          min={0}
          max={max}
          step={step}
          value={minVal}
          onChange={(e) => {
            const v = Number(e.target.value);
            onMinChange(Math.min(v, maxVal - step));
          }}
          className="dual-range-input"
          style={{ zIndex: minVal >= maxVal - step ? 5 : 3 }}
        />
        {/* Max input */}
        <input
          type="range"
          min={0}
          max={max}
          step={step}
          value={maxVal}
          onChange={(e) => {
            const v = Number(e.target.value);
            onMaxChange(Math.max(v, minVal + step));
          }}
          className="dual-range-input"
          style={{ zIndex: 4 }}
        />
      </div>
      <div className="flex gap-3 mb-3">
        <div className="flex-1">
          <label className="text-xs text-gray-900 block mb-1">Min</label>
          <input
            type="number"
            min={0}
            max={maxVal}
            step={step}
            value={minVal}
            onChange={(e) => {
              const v = Math.max(
                0,
                Math.min(Number(e.target.value), maxVal - step),
              );
              onMinChange(isNaN(v) ? 0 : v);
            }}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:border-blue-400"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-900 block mb-1">Max</label>
          <input
            type="number"
            min={minVal}
            max={max}
            step={step}
            value={maxVal}
            onChange={(e) => {
              const v = Math.min(
                max,
                Math.max(Number(e.target.value), minVal + step),
              );
              onMaxChange(isNaN(v) ? max : v);
            }}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:border-blue-400"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-900 cursor-pointer">
        <input
          type="checkbox"
          checked={includeUnspecified}
          onChange={(e) => onIncludeUnspecifiedChange(e.target.checked)}
          className="shrink-0"
        />
        Include jobs with no specified salary
      </label>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = { jobs: JobApplicationListItem[] };

export function JobTable({ jobs }: Props) {
  const router = useRouter();
  const [sort, setSort] = useState<SortState>({
    column: "savedAt",
    direction: "desc",
  });
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  // Dynamic options built from the data
  const allSources = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach((j) => {
      if (j.source) set.add(j.source);
    });
    return Array.from(set)
      .sort()
      .map((s) => ({ value: s, label: s }));
  }, [jobs]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach((j) => j.tags?.forEach((t) => set.add(t)));
    return Array.from(set)
      .sort()
      .map((t) => ({ value: t, label: t }));
  }, [jobs]);

  const maxSalary = useMemo(() => {
    const parsed = jobs
      .map((j) => parseSalary(j.salary))
      .filter((r): r is { min: number; max: number } => r !== null);
    if (parsed.length === 0) return 0;
    return Math.ceil(Math.max(...parsed.map((r) => r.max)) / 10000) * 10000;
  }, [jobs]);

  const sliderMin = filters.salaryMin ?? 0;
  const sliderMax = filters.salaryMax ?? maxSalary;

  const activeFilterCount = useMemo(
    () => countActiveFilters(filters),
    [filters],
  );

  const handleSort = (column: SortColumn) => {
    setSort((prev) => ({
      column,
      direction:
        prev.column === column
          ? prev.direction === "asc"
            ? "desc"
            : "asc"
          : "asc",
    }));
  };

  function toggleSetFilter<T extends string>(key: keyof FilterState, value: T) {
    setFilters((prev) => {
      const set = new Set(prev[key] as Set<T>);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      return { ...prev, [key]: set };
    });
  }

  const displayedJobs = useMemo(() => {
    let result = [...jobs];

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (j) =>
          j.company.toLowerCase().includes(q) ||
          j.title.toLowerCase().includes(q) ||
          (j.location?.toLowerCase().includes(q) ?? false) ||
          (j.tags?.some((t) => t.toLowerCase().includes(q)) ?? false),
      );
    }

    // Filters
    if (filters.status.size > 0)
      result = result.filter((j) => filters.status.has(j.status));

    if (filters.interestLevel.size > 0)
      result = result.filter(
        (j) => j.interestLevel && filters.interestLevel.has(j.interestLevel),
      );

    if (filters.remoteType.size > 0)
      result = result.filter(
        (j) => j.remoteType && filters.remoteType.has(j.remoteType),
      );

    if (filters.jobType.size > 0)
      result = result.filter(
        (j) => j.jobType && filters.jobType.has(j.jobType),
      );

    if (filters.source.size > 0)
      result = result.filter((j) => filters.source.has(j.source));

    if (filters.tags.size > 0)
      result = result.filter((j) => j.tags?.some((t) => filters.tags.has(t)));

    if (filters.salaryMin !== null || filters.salaryMax !== null) {
      result = result.filter((j) => {
        const parsed = parseSalary(j.salary);
        if (parsed === null) return filters.includeUnspecifiedSalary;
        // Range overlap: job passes if job.max >= filterMin AND job.min <= filterMax
        const filterMin = filters.salaryMin ?? 0;
        const filterMax = filters.salaryMax ?? Infinity;
        return parsed.max >= filterMin && parsed.min <= filterMax;
      });
    } else if (!filters.includeUnspecifiedSalary) {
      result = result.filter((j) => parseSalary(j.salary) !== null);
    }

    if (filters.savedDateFrom)
      result = result.filter((j) => j.savedAt >= filters.savedDateFrom!);

    if (filters.savedDateTo)
      result = result.filter(
        (j) => j.savedAt.slice(0, 10) <= filters.savedDateTo!,
      );

    if (filters.resumeSubmitted !== "either")
      result = result.filter(
        (j) =>
          (j.resumeSubmitted ?? false) === (filters.resumeSubmitted === "yes"),
      );

    if (filters.coverLetterSubmitted !== "either")
      result = result.filter(
        (j) =>
          (j.coverLetterSubmitted ?? false) ===
          (filters.coverLetterSubmitted === "yes"),
      );

    // Sort
    return result.sort((a, b) => {
      let cmp = 0;
      const { column, direction } = sort;

      if (column === "company") cmp = a.company.localeCompare(b.company);
      else if (column === "title") cmp = a.title.localeCompare(b.title);
      else if (column === "status")
        cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      else if (column === "location")
        cmp = (a.location ?? "").localeCompare(b.location ?? "");
      else if (column === "salary") {
        const aVal = parseSalary(a.salary);
        const bVal = parseSalary(b.salary);
        if (aVal === null && bVal === null) cmp = 0;
        else if (aVal === null) cmp = 1;
        else if (bVal === null) cmp = -1;
        else cmp = (aVal.min + aVal.max) / 2 - (bVal.min + bVal.max) / 2;
      } else if (column === "savedAt") cmp = a.savedAt.localeCompare(b.savedAt);

      return direction === "asc" ? cmp : -cmp;
    });
  }, [jobs, search, filters, sort]);

  function SortHeader({
    column,
    children,
  }: {
    column: SortColumn;
    children: React.ReactNode;
  }) {
    const isActive = sort.column === column;
    return (
      <th
        className={`py-2 pr-4 cursor-pointer select-none whitespace-nowrap group transition-colors ${
          isActive
            ? "font-medium border-b-2 border-blue-400"
            : "font-semibold hover:bg-white/5"
        }`}
        onClick={() => handleSort(column)}
      >
        {children}
        <span
          className={`ml-1 text-xs transition-colors ${
            isActive
              ? "text-blue-400"
              : "text-gray-500 group-hover:text-gray-300"
          }`}
        >
          {isActive ? (sort.direction === "asc" ? "▲" : "▼") : "⇅"}
        </span>
      </th>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-3">
        <div className="relative flex-1 max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
            &#x1F50D;
          </span>
          <input
            ref={searchRef}
            type="text"
            placeholder="Search company, title, location, or tags…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-blue-400"
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                searchRef.current?.focus();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-200 text-lg leading-none"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setFilterOpen((o) => !o)}
          className={`px-4 py-2 rounded-md text-sm border transition-colors whitespace-nowrap ${
            filterOpen || activeFilterCount > 0
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
          }`}
        >
          Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </button>
      </div>

      {/* Collapsible filter panel — grid-rows trick for smooth height animation */}
      <div
        className={`grid transition-all duration-300 ease-out overflow-hidden ${
          filterOpen ? "grid-rows-[1fr] mb-4" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0">
          <div className="border border-gray-200 rounded-lg p-5 bg-gray-50">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
              {/* Status */}
              <MultiPills
                label="Status"
                options={[
                  { value: "saved", label: "Saved" },
                  { value: "applied", label: "Applied" },
                  { value: "oa", label: "OA" },
                  { value: "interview", label: "Interview" },
                  { value: "offer", label: "Offer" },
                  { value: "rejected", label: "Rejected" },
                  { value: "ghosted", label: "Ghosted" },
                ]}
                selected={filters.status}
                onToggle={(v) => toggleSetFilter("status", v)}
              />

              {/* Interest level */}
              <MultiPills
                label="Interest Level"
                options={[
                  { value: "low", label: "Low" },
                  { value: "medium", label: "Medium" },
                  { value: "high", label: "High" },
                  { value: "very-high", label: "Very High" },
                ]}
                selected={filters.interestLevel}
                onToggle={(v) => toggleSetFilter("interestLevel", v)}
              />

              {/* Remote type */}
              <MultiPills
                label="Remote Type"
                options={[
                  { value: "remote", label: "Remote" },
                  { value: "hybrid", label: "Hybrid" },
                  { value: "onsite", label: "Onsite" },
                ]}
                selected={filters.remoteType}
                onToggle={(v) => toggleSetFilter("remoteType", v)}
              />

              {/* Job type */}
              <MultiDropdown
                label="Job Type"
                placeholder="Any job type"
                options={[
                  { value: "full-time", label: "Full-time" },
                  { value: "part-time", label: "Part-time" },
                  { value: "contract", label: "Contract" },
                  { value: "internship", label: "Internship" },
                  { value: "graduate", label: "Graduate" },
                  { value: "fixed-term", label: "Fixed-term" },
                  { value: "permanent", label: "Permanent" },
                ]}
                selected={filters.jobType}
                onToggle={(v) => toggleSetFilter("jobType", v)}
              />

              {/* Source */}
              <MultiDropdown
                label="Source"
                placeholder="Any source"
                options={allSources}
                selected={filters.source}
                onToggle={(v) => toggleSetFilter("source", v)}
              />

              {/* Tags */}
              <MultiDropdown
                label="Tags"
                placeholder="Any tag"
                options={allTags}
                selected={filters.tags}
                onToggle={(v) => toggleSetFilter("tags", v)}
              />

              {/* Salary — spans full width */}
              <div className="sm:col-span-2 lg:col-span-3">
                <SalarySlider
                  max={maxSalary}
                  minVal={sliderMin}
                  maxVal={sliderMax || maxSalary}
                  includeUnspecified={filters.includeUnspecifiedSalary}
                  onMinChange={(v) => {
                    const newMin = v === 0 ? null : v;
                    setFilters((f) => ({
                      ...f,
                      salaryMin: newMin,
                      includeUnspecifiedSalary:
                        newMin !== null || f.salaryMax !== null ? false : true,
                    }));
                  }}
                  onMaxChange={(v) => {
                    const newMax = v === maxSalary ? null : v;
                    setFilters((f) => ({
                      ...f,
                      salaryMax: newMax,
                      includeUnspecifiedSalary:
                        f.salaryMin !== null || newMax !== null ? false : true,
                    }));
                  }}
                  onIncludeUnspecifiedChange={(v) =>
                    setFilters((f) => ({ ...f, includeUnspecifiedSalary: v }))
                  }
                />
              </div>

              {/* Saved date range */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Saved Date
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={filters.savedDateFrom ?? ""}
                    onChange={(e) =>
                      setFilters((f) => ({
                        ...f,
                        savedDateFrom: e.target.value || null,
                      }))
                    }
                    className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:border-blue-400"
                  />
                  <span className="text-gray-400 text-sm">–</span>
                  <input
                    type="date"
                    value={filters.savedDateTo ?? ""}
                    onChange={(e) =>
                      setFilters((f) => ({
                        ...f,
                        savedDateTo: e.target.value || null,
                      }))
                    }
                    className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              {/* Resume submitted */}
              <ThreeWayToggle
                label="Resume Submitted"
                value={filters.resumeSubmitted}
                onChange={(v) =>
                  setFilters((f) => ({ ...f, resumeSubmitted: v }))
                }
              />

              {/* Cover letter submitted */}
              <ThreeWayToggle
                label="Cover Letter"
                value={filters.coverLetterSubmitted}
                onChange={(v) =>
                  setFilters((f) => ({ ...f, coverLetterSubmitted: v }))
                }
              />
            </div>

            {/* Panel footer */}
            <div className="mt-5 pt-4 border-t border-gray-200 flex items-center justify-between">
              <span className="text-sm text-gray-500">
                {displayedJobs.length} of {jobs.length} job
                {jobs.length !== 1 ? "s" : ""}
              </span>
              <button
                onClick={() => setFilters(DEFAULT_FILTERS)}
                disabled={activeFilterCount === 0}
                className="text-sm text-blue-600 hover:text-blue-800 underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
              >
                Clear all
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      {jobs.length === 0 ? (
        <p className="text-gray-600">
          No jobs saved yet. Use the extension to save a job.
        </p>
      ) : displayedJobs.length === 0 ? (
        <p className="text-gray-500">No jobs match your search or filters.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-gray-300 text-left">
              <SortHeader column="title">Title</SortHeader>
              <SortHeader column="company">Company</SortHeader>
              <SortHeader column="location">Location</SortHeader>
              <th className="py-2 pr-4 font-semibold">Remote</th>
              <SortHeader column="salary">Salary</SortHeader>
              <th className="py-2 pr-4 font-semibold">Source</th>
              <SortHeader column="status">Status</SortHeader>
              <SortHeader column="savedAt">Saved at</SortHeader>
              <th className="py-2 font-semibold">URL</th>
            </tr>
          </thead>
          <tbody>
            {displayedJobs.map((job) => (
              <tr
                key={job.id}
                className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                onClick={() => router.push(`/jobs/${job.id}`)}
              >
                <td className="py-2 pr-4 text-blue-700">{job.title}</td>
                <td className="py-2 pr-4">{job.company}</td>
                <td className="py-2 pr-4">{job.location ?? "—"}</td>
                <td className="py-2 pr-4">{job.remoteType ?? "—"}</td>
                <td className="py-2 pr-4">{job.salary ?? "—"}</td>
                <td className="py-2 pr-4">{job.source}</td>
                <td className="py-2 pr-4">{job.status}</td>
                <td className="py-2 pr-4">
                  {new Date(job.savedAt).toLocaleString("en-GB")}
                </td>
                <td className="py-2">
                  <a
                    href={job.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-700 underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Link
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
