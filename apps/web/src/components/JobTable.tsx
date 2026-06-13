"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import type {
  JobApplicationListItem,
  ApplicationStatus,
  RemoteType,
  JobType,
} from "@job-tracker/shared";
import { parseSalary } from "@job-tracker/shared";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { ExpandedJobPanel } from "@/components/ExpandedJobPanel";

// ─── Column preferences ───────────────────────────────────────────────────────

const DEFAULT_VISIBLE_COLUMNS = new Set([
  "company", "title", "status",
  "jobType", "remoteType", "location", "salaryRaw",
  "interestLevel", "appliedAt", "resumeCoverLetter", "sourceUrl",
]);

const INTEREST_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  "very-high": "Very High",
};

// ─── Types ───────────────────────────────────────────────────────────────────

type SortColumn =
  | "company"
  | "title"
  | "status"
  | "location"
  | "salary"
  | "appliedAt";
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

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  saved:     "Saved",
  applied:   "Applied",
  oa:        "OA",
  interview: "Interview",
  offer:     "Offer",
  rejected:  "Rejected",
  ghosted:   "Ghosted",
};

const STATUS_BADGE: Record<ApplicationStatus, string> = {
  saved:     "bg-gray-100 text-gray-600",
  applied:   "bg-blue-100 text-blue-700",
  oa:        "bg-violet-100 text-violet-700",
  interview: "bg-amber-100 text-amber-700",
  offer:     "bg-green-100 text-green-700",
  rejected:  "bg-red-100 text-red-600",
  ghosted:   "bg-gray-100 text-gray-400",
};

const STATUS_DOT: Record<ApplicationStatus, string> = {
  saved:     "bg-gray-400",
  applied:   "bg-blue-400",
  oa:        "bg-violet-400",
  interview: "bg-amber-400",
  offer:     "bg-green-400",
  rejected:  "bg-red-400",
  ghosted:   "bg-gray-300",
};

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: "saved",     label: "Saved"     },
  { value: "applied",   label: "Applied"   },
  { value: "oa",        label: "OA"        },
  { value: "interview", label: "Interview" },
  { value: "offer",     label: "Offer"     },
  { value: "rejected",  label: "Rejected"  },
  { value: "ghosted",   label: "Ghosted"   },
];

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

function formatDate(iso: string | undefined | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function renderLocation(loc: string): React.ReactNode {
  if (!loc) return "—";

  const slashIdx = loc.indexOf("/");
  if (slashIdx !== -1) {
    const before = loc.slice(0, slashIdx + 1);
    const after = loc.slice(slashIdx + 1);
    if (after.trim()) {
      return (
        <span>
          <span className="block">{before}</span>
          <span className="block">{after}</span>
        </span>
      );
    }
  }

  const parenIdx = loc.indexOf("(");
  if (parenIdx !== -1) {
    const before = loc.slice(0, parenIdx).trim();
    const after = loc.slice(parenIdx);
    if (after.trim()) {
      return (
        <span>
          <span className="block">{before}</span>
          <span className="block">{after}</span>
        </span>
      );
    }
  }

  return loc;
}

function formatSalaryCell(raw: string | undefined | null): React.ReactNode {
  if (!raw) return "—";
  // Split on en-dash, em-dash, or hyphen (salary range)
  const parts = raw.split(/\s*[–—-]\s*/);
  if (parts.length === 2 && parts[0] && parts[1]) {
    return (
      <>
        <span className="block">{parts[0].trim()} –</span>
        <span className="block">{parts[1].trim()}</span>
      </>
    );
  }
  const toMatch = raw.match(/^(.+?)\s+to\s+(.+)$/i);
  if (toMatch) {
    return (
      <>
        <span className="block">{toMatch[1].trim()} –</span>
        <span className="block">{toMatch[2].trim()}</span>
      </>
    );
  }
  return raw;
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

// ─── StatusCell ───────────────────────────────────────────────────────────────

type StatusCellProps = {
  jobId: string;
  status: ApplicationStatus;
  onStatusChange: (jobId: string, newStatus: ApplicationStatus) => Promise<void>;
  saving: boolean;
};

function StatusCell({ jobId, status, onStatusChange, saving }: StatusCellProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => !saving && setOpen((o) => !o)}
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-opacity whitespace-nowrap ${
          STATUS_BADGE[status]
        } ${saving ? "opacity-50 cursor-wait" : "cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-gray-300"}`}
      >
        {STATUS_LABELS[status]}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-30 bg-white rounded-lg border border-gray-200 shadow-lg py-1 min-w-[140px]">
          {STATUS_OPTIONS.map((opt) => {
            const isSelected = opt.value === status;
            return (
              <button
                key={opt.value}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-left hover:bg-gray-50 transition-colors ${
                  isSelected ? "font-medium" : ""
                }`}
                onClick={() => {
                  void onStatusChange(jobId, opt.value);
                  setOpen(false);
                }}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[opt.value]}`} />
                <span className="text-gray-700">{opt.label}</span>
                {isSelected && <span className="ml-auto text-gray-400 text-[10px]">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── ConfirmModal ─────────────────────────────────────────────────────────────

function ConfirmModal({
  type,
  count,
  onConfirm,
  onCancel,
}: {
  type: "delete" | "archive";
  count: number;
  onConfirm: (dontAskAgain: boolean) => void;
  onCancel: () => void;
}) {
  const [dontAsk, setDontAsk] = useState(false);
  const isDelete = type === "delete";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Are you sure?</h2>
        <p className="text-sm text-gray-600 mb-5">
          {isDelete
            ? `This will permanently delete ${count} application${count !== 1 ? "s" : ""}. This cannot be undone.`
            : `This will archive ${count} application${count !== 1 ? "s" : ""}.`}
        </p>
        <label className="flex items-center gap-2 text-sm text-gray-700 mb-6 cursor-pointer">
          <input
            type="checkbox"
            checked={dontAsk}
            onChange={(e) => setDontAsk(e.target.checked)}
            className="shrink-0"
          />
          Don&apos;t ask again
        </label>
        <div className="flex justify-between gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(dontAsk)}
            className={`px-4 py-2 rounded-md text-sm text-white font-medium transition-colors ${
              isDelete ? "bg-red-600 hover:bg-red-700" : "bg-amber-500 hover:bg-amber-600"
            }`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  jobs: JobApplicationListItem[];
  newJobId?: string;
  onAddJob?: () => void;
};

export function JobTable({ jobs, newJobId, onAddJob }: Props) {
  // Local copy — lets us optimistically remove deleted rows without a page reload
  const [localJobs, setLocalJobs] = useState<JobApplicationListItem[]>(jobs);
  useEffect(() => { setLocalJobs(jobs); }, [jobs]);

  const [sort, setSort] = useState<SortState>({ column: "appliedAt", direction: "desc" });
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  // Column visibility + bulk-warning prefs (loaded from /api/preferences on mount)
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set(DEFAULT_VISIBLE_COLUMNS),
  );
  const [skipDeleteWarning, setSkipDeleteWarning] = useState(false);
  const [skipArchiveWarning, setSkipArchiveWarning] = useState(false);

  useEffect(() => {
    async function loadPreferences() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const res = await fetch("/api/preferences", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) return;
        const prefs = (await res.json()) as {
          visible_columns: string[];
          skip_bulk_delete_warning: boolean;
          skip_bulk_archive_warning: boolean;
        };
        if (Array.isArray(prefs.visible_columns)) {
          const cols = new Set(prefs.visible_columns);
          cols.add("company"); cols.add("title"); cols.add("status");
          setVisibleColumns(cols);
        }
        setSkipDeleteWarning(prefs.skip_bulk_delete_warning ?? false);
        setSkipArchiveWarning(prefs.skip_bulk_archive_warning ?? false);
      } catch {
        // Keep defaults on any error
      }
    }
    void loadPreferences();
  }, []);

  const show = (col: string) => visibleColumns.has(col);

  // Inline status editing
  const [statusPatch, setStatusPatch] = useState<Record<string, ApplicationStatus>>({});
  const [patchingId, setPatchingId] = useState<string | null>(null);

  // Inline docs editing (resume + cover letter)
  type DocField = "resumeSubmitted" | "coverLetterSubmitted";
  type DocOverride = Partial<Record<DocField, boolean>>;
  const [docsPatch, setDocsPatch] = useState<Record<string, DocOverride>>({});
  const [patchingDocs, setPatchingDocs] = useState<Set<string>>(new Set());

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Bulk action controls
  const [bulkStatus, setBulkStatus] = useState<ApplicationStatus | "">("");
  const [bulkTags, setBulkTags] = useState("");
  const [deleteActive, setDeleteActive] = useState(false);
  const [archiveActive, setArchiveActive] = useState(false);
  const [applying, setApplying] = useState(false);
  const [modal, setModal] = useState<{ type: "delete" | "archive"; count: number } | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [archivedJobs, setArchivedJobs] = useState<JobApplicationListItem[] | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [stillActivating, setStillActivating] = useState<Set<string>>(new Set());

  // New-row highlight — highlightedId shows green, fadingId holds the slow transition
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [fadingId, setFadingId]           = useState<string | null>(null);

  useEffect(() => {
    if (!newJobId) return;
    setHighlightedId(newJobId);
    const t1 = setTimeout(() => {
      setFadingId(newJobId);
      setHighlightedId(null);
    }, 50);
    const t2 = setTimeout(() => setFadingId(null), 700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [newJobId]);

  // ─── Expand / collapse ────────────────────────────────────────────────────

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [closingId, setClosingId]   = useState<string | null>(null);

  function toggleExpand(id: string) {
    if (expandedId === id) {
      setClosingId(id);
      setExpandedId(null);
      setTimeout(() => setClosingId(null), 350);
    } else {
      setClosingId(null);
      setExpandedId(id);
    }
  }

  function handleJobPatched(id: string, patch: Record<string, unknown>) {
    const applyPatch = (prev: JobApplicationListItem[]) =>
      prev.map((j) => {
        if (j.id !== id) return j;
        // Convert null values to undefined to match JobApplicationListItem shape
        const normalised = Object.fromEntries(
          Object.entries(patch).map(([k, v]) => [k, v === null ? undefined : v]),
        );
        // Optimistically set appliedAt to today when status changes to "applied"
        // and the job doesn't already have one, matching the API's auto-set logic.
        if (patch.status === "applied" && !j.appliedAt) {
          normalised.appliedAt = new Date().toISOString().split("T")[0];
        }
        return { ...j, ...normalised } as JobApplicationListItem;
      });
    setLocalJobs(applyPatch);
    setArchivedJobs((prev) => prev ? applyPatch(prev) : null);
    if ("status" in patch) {
      setStatusPatch((prev) => { const n = { ...prev }; delete n[id]; return n; });
    }
  }

  // ─── Auth helper ──────────────────────────────────────────────────────────

  const getToken = useCallback(async (): Promise<string> => {
    const supabase = createSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Not authenticated");
    return session.access_token;
  }, []);

  // ─── Single-row handlers ──────────────────────────────────────────────────

  async function handleStatusChange(jobId: string, newStatus: ApplicationStatus) {
    setStatusPatch((prev) => ({ ...prev, [jobId]: newStatus }));
    setPatchingId(jobId);
    try {
      const token = await getToken();
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(`Patch failed: ${res.status}`);
      const today = new Date().toISOString().split("T")[0];
      if (newStatus === "applied") {
        setLocalJobs((prev) =>
          prev.map((j) =>
            j.id === jobId
              ? { ...j, status: newStatus, appliedAt: j.appliedAt ?? today }
              : j,
          ),
        );
      } else {
        setLocalJobs((prev) =>
          prev.map((j) => (j.id === jobId ? { ...j, status: newStatus } : j)),
        );
      }
    } catch {
      setStatusPatch((prev) => { const n = { ...prev }; delete n[jobId]; return n; });
    } finally {
      setPatchingId(null);
    }
  }

  async function handleDocChange(jobId: string, field: DocField, value: boolean) {
    const patchKey = `${jobId}-${field}`;
    if (patchingDocs.has(patchKey)) return;
    setDocsPatch((prev) => ({ ...prev, [jobId]: { ...(prev[jobId] ?? {}), [field]: value } }));
    setPatchingDocs((prev) => new Set(prev).add(patchKey));
    try {
      const token = await getToken();
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error(`Patch failed: ${res.status}`);
    } catch {
      setDocsPatch((prev) => {
        const next = { ...prev };
        const jobDocs = { ...(next[jobId] ?? {}) };
        delete jobDocs[field];
        if (Object.keys(jobDocs).length === 0) delete next[jobId];
        else next[jobId] = jobDocs;
        return next;
      });
    } finally {
      setPatchingDocs((prev) => { const n = new Set(prev); n.delete(patchKey); return n; });
    }
  }

  // ─── Bulk handlers ────────────────────────────────────────────────────────

  async function fetchArchivedJobs() {
    setArchiveLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/jobs?archived=true", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = (await res.json()) as JobApplicationListItem[];
      setArchivedJobs(data);
    } catch {
      setArchivedJobs([]);
    } finally {
      setArchiveLoading(false);
    }
  }

  async function handleStillActive(jobId: string) {
    setStillActivating((prev) => new Set(prev).add(jobId));
    try {
      const token = await getToken();
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isArchived: false, archivedAt: null }),
      });
      if (!res.ok) throw new Error("Unarchive failed");
      setArchivedJobs((prev) => prev?.filter((j) => j.id !== jobId) ?? null);
    } finally {
      setStillActivating((prev) => { const n = new Set(prev); n.delete(jobId); return n; });
    }
  }

  async function executeBulkArchive(ids: string[]) {
    const token = await getToken();
    const res = await fetch("/api/jobs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "archive", ids }),
    });
    if (!res.ok) throw new Error("Archive failed");
    setLocalJobs((prev) => prev.filter((j) => !ids.includes(j.id)));
    setSelectedIds(new Set());
    setArchiveActive(false);
    setBulkStatus("");
    setBulkTags("");
  }

  async function executeDelete(ids: string[]) {
    const token = await getToken();
    const res = await fetch("/api/jobs", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) throw new Error("Delete failed");
    setLocalJobs((prev) => prev.filter((j) => !ids.includes(j.id)));
    setSelectedIds(new Set());
    setDeleteActive(false);
    setBulkStatus("");
    setBulkTags("");
  }

  async function handleApply() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    if (deleteActive) {
      if (skipDeleteWarning) {
        setApplying(true);
        try { await executeDelete(ids); } finally { setApplying(false); }
      } else {
        setModal({ type: "delete", count: ids.length });
      }
      return;
    }

    if (archiveActive) {
      if (skipArchiveWarning) {
        setApplying(true);
        try { await executeBulkArchive(ids); } finally { setApplying(false); }
      } else {
        setModal({ type: "archive", count: ids.length });
      }
      return;
    }

    const hasStatus = bulkStatus !== "";
    const hasNewTags = bulkTags.trim() !== "";
    if (!hasStatus && !hasNewTags) return;

    setApplying(true);
    try {
      const token = await getToken();
      const newTagList = hasNewTags
        ? bulkTags.split(",").map((t) => t.trim()).filter(Boolean)
        : [];

      await Promise.all(
        ids.map(async (id) => {
          const patches: Record<string, unknown> = {};
          if (hasStatus) patches.status = bulkStatus;
          if (hasNewTags) {
            const existing = localJobs.find((j) => j.id === id)?.tags ?? [];
            patches.tags = Array.from(new Set([...existing, ...newTagList]));
          }
          const res = await fetch(`/api/jobs/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(patches),
          });
          if (!res.ok) return;
          if (hasStatus)
            setStatusPatch((prev) => ({ ...prev, [id]: bulkStatus as ApplicationStatus }));
          if (hasNewTags)
            setLocalJobs((prev) =>
              prev.map((j) => j.id === id ? { ...j, tags: patches.tags as string[] } : j),
            );
        }),
      );
    } finally {
      setSelectedIds(new Set());
      setBulkStatus("");
      setBulkTags("");
      setApplying(false);
    }
  }

  async function handleModalConfirm(dontAskAgain: boolean) {
    const ids = Array.from(selectedIds);
    const type = modal!.type;
    setModal(null);

    if (dontAskAgain) {
      try {
        const token = await getToken();
        const prefKey =
          type === "delete" ? "skip_bulk_delete_warning" : "skip_bulk_archive_warning";
        await fetch("/api/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ [prefKey]: true }),
        });
        if (type === "delete") setSkipDeleteWarning(true);
        else setSkipArchiveWarning(true);
      } catch { /* preference update is best-effort */ }
    }

    if (type === "delete") {
      try { await executeDelete(ids); } catch { /* silent */ }
    } else {
      try { await executeBulkArchive(ids); } catch { /* silent */ }
    }
  }

  // ─── Derived data ─────────────────────────────────────────────────────────

  const baseJobs = useMemo(
    () => (showArchived ? archivedJobs ?? [] : localJobs),
    [showArchived, archivedJobs, localJobs],
  );

  const allSources = useMemo(() => {
    const set = new Set<string>();
    baseJobs.forEach((j) => { if (j.source) set.add(j.source); });
    return Array.from(set).sort().map((s) => ({ value: s, label: s }));
  }, [baseJobs]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    baseJobs.forEach((j) => j.tags?.forEach((t) => set.add(t)));
    return Array.from(set).sort().map((t) => ({ value: t, label: t }));
  }, [baseJobs]);

  const maxSalary = useMemo(() => {
    const maxVals = baseJobs
      .map((j) => {
        if (j.salaryMax != null) return j.salaryMax;
        return parseSalary(j.salaryRaw)?.max ?? null;
      })
      .filter((v): v is number => v !== null);
    if (maxVals.length === 0) return 0;
    return Math.ceil(Math.max(...maxVals) / 10000) * 10000;
  }, [baseJobs]);

  const sliderMin = filters.salaryMin ?? 0;
  const sliderMax = filters.salaryMax ?? maxSalary;
  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

  const handleSort = (column: SortColumn) => {
    setSort((prev) => ({
      column,
      direction: prev.column === column
        ? prev.direction === "asc" ? "desc" : "asc"
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
    const effectiveStatus = (j: JobApplicationListItem): ApplicationStatus =>
      statusPatch[j.id] ?? j.status;

    let result = [...baseJobs];

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

    if (filters.status.size > 0)
      result = result.filter((j) => filters.status.has(effectiveStatus(j)));
    if (filters.interestLevel.size > 0)
      result = result.filter((j) => j.interestLevel && filters.interestLevel.has(j.interestLevel));
    if (filters.remoteType.size > 0)
      result = result.filter((j) => j.remoteType && filters.remoteType.has(j.remoteType));
    if (filters.jobType.size > 0)
      result = result.filter((j) => j.jobType && filters.jobType.has(j.jobType));
    if (filters.source.size > 0)
      result = result.filter((j) => filters.source.has(j.source));
    if (filters.tags.size > 0)
      result = result.filter((j) => j.tags?.some((t) => filters.tags.has(t)));

    if (filters.salaryMin !== null || filters.salaryMax !== null) {
      result = result.filter((j) => {
        let jobMin: number | null = j.salaryMin ?? null;
        let jobMax: number | null = j.salaryMax ?? null;
        if (jobMin === null || jobMax === null) {
          const parsed = parseSalary(j.salaryRaw);
          if (parsed) {
            if (jobMin === null) jobMin = parsed.min;
            if (jobMax === null) jobMax = parsed.max;
          }
        }
        if (jobMin === null || jobMax === null) return filters.includeUnspecifiedSalary;
        const filterMin = filters.salaryMin ?? 0;
        const filterMax = filters.salaryMax ?? Infinity;
        return jobMax >= filterMin && jobMin <= filterMax;
      });
    } else if (!filters.includeUnspecifiedSalary) {
      result = result.filter((j) => {
        if (j.salaryMin != null || j.salaryMax != null) return true;
        return parseSalary(j.salaryRaw) !== null;
      });
    }

    if (filters.savedDateFrom)
      result = result.filter((j) => j.savedAt >= filters.savedDateFrom!);
    if (filters.savedDateTo)
      result = result.filter((j) => j.savedAt.slice(0, 10) <= filters.savedDateTo!);
    if (filters.resumeSubmitted !== "either")
      result = result.filter(
        (j) => (j.resumeSubmitted ?? false) === (filters.resumeSubmitted === "yes"),
      );
    if (filters.coverLetterSubmitted !== "either")
      result = result.filter(
        (j) => (j.coverLetterSubmitted ?? false) === (filters.coverLetterSubmitted === "yes"),
      );

    return result.sort((a, b) => {
      let cmp = 0;
      const { column, direction } = sort;
      if (column === "company") cmp = a.company.localeCompare(b.company);
      else if (column === "title") cmp = a.title.localeCompare(b.title);
      else if (column === "status")
        cmp = STATUS_ORDER[effectiveStatus(a)] - STATUS_ORDER[effectiveStatus(b)];
      else if (column === "location")
        cmp = (a.location ?? "").localeCompare(b.location ?? "");
      else if (column === "salary") {
        const getMid = (j: JobApplicationListItem) => {
          const min = j.salaryMin ?? parseSalary(j.salaryRaw)?.min ?? null;
          const max = j.salaryMax ?? parseSalary(j.salaryRaw)?.max ?? null;
          if (min === null || max === null) return null;
          return (min + max) / 2;
        };
        const aMid = getMid(a);
        const bMid = getMid(b);
        if (aMid === null && bMid === null) cmp = 0;
        else if (aMid === null) cmp = 1;
        else if (bMid === null) cmp = -1;
        else cmp = aMid - bMid;
      } else if (column === "appliedAt") {
        if (!a.appliedAt && !b.appliedAt) cmp = 0;
        else if (!a.appliedAt) cmp = 1;
        else if (!b.appliedAt) cmp = -1;
        else cmp = a.appliedAt.localeCompare(b.appliedAt);
      }
      return direction === "asc" ? cmp : -cmp;
    });
  }, [baseJobs, search, filters, sort, statusPatch]);

  // ─── Selection helpers ────────────────────────────────────────────────────

  const allDisplayedSelected =
    displayedJobs.length > 0 && displayedJobs.every((j) => selectedIds.has(j.id));
  const someDisplayedSelected =
    displayedJobs.some((j) => selectedIds.has(j.id)) && !allDisplayedSelected;

  function toggleSelectAll() {
    if (allDisplayedSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayedJobs.map((j) => j.id)));
    }
  }

  function toggleSelectOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ─── SortHeader (closure over sort state) ─────────────────────────────────

  function SortHeader({ column, children, className = "" }: { column: SortColumn; children: React.ReactNode; className?: string }) {
    const isActive = sort.column === column;
    return (
      <th
        className={`py-2 pb-3 pr-4 cursor-pointer select-none text-xs font-semibold uppercase tracking-wide group transition-colors ${className} ${
          isActive ? "text-blue-500" : "text-gray-500 hover:text-gray-700"
        }`}
        onClick={() => handleSort(column)}
      >
        {children}
        <span className={`ml-1 text-xs ${isActive ? "text-blue-400" : "text-gray-400 group-hover:text-gray-600"}`}>
          {isActive ? (sort.direction === "asc" ? "▲" : "▼") : "⇅"}
        </span>
      </th>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 flex flex-col gap-2">

      {/* Fixed-height controls area — spacer + search bar + banner always occupy the same vertical space */}
      <div className="h-24 flex flex-col gap-2">
        {/* Spacer grows to fill unused space, pushing search bar and banner to the bottom */}
        <div className="flex-1" />

        {/* Search bar + filter button */}
        <div className="flex items-center gap-3">
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
              className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
            />
            {search && (
              <button
                onClick={() => { setSearch(""); searchRef.current?.focus(); }}
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
          <button
            onClick={() => {
              const next = !showArchived;
              setShowArchived(next);
              setSelectedIds(new Set());
              if (next && archivedJobs === null) void fetchArchivedJobs();
            }}
            disabled={archiveLoading}
            className={`px-4 py-2 rounded-md text-sm border transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-wait ${
              showArchived
                ? "bg-amber-500 text-white border-amber-500"
                : "bg-white text-gray-700 border-gray-300 hover:border-amber-400"
            }`}
          >
            {archiveLoading && <Loader2 size={14} className="animate-spin mr-1 inline" />}
            {showArchived ? "Hide archived" : "Show archived"}
          </button>
          {onAddJob && (
            <button
              onClick={onAddJob}
              className="px-4 py-2 rounded-md text-sm bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              + Add job
            </button>
          )}
        </div>

        {/* Banner — only mounted when rows are selected */}
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
              {selectedIds.size} selected
            </span>
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value as ApplicationStatus | "")}
              className="text-sm border border-gray-300 rounded-md px-2 py-1.5 text-gray-700 bg-white focus:outline-none focus:border-blue-400"
            >
              <option value="">Change status…</option>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Add tags (comma separated)…"
              value={bulkTags}
              onChange={(e) => setBulkTags(e.target.value)}
              className="flex-1 min-w-[180px] text-sm border border-gray-300 rounded-md px-2 py-1.5 text-gray-700 focus:outline-none focus:border-blue-400"
            />
            <button
              onClick={() => { setArchiveActive((a) => !a); setDeleteActive(false); }}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors whitespace-nowrap ${
                archiveActive
                  ? "bg-amber-500 text-white border-amber-500"
                  : "border-amber-400 text-amber-600 hover:bg-amber-50"
              }`}
            >
              Archive
            </button>
            <button
              onClick={() => { setDeleteActive((d) => !d); setArchiveActive(false); }}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors whitespace-nowrap ${
                deleteActive
                  ? "bg-red-600 text-white border-red-600"
                  : "border-red-400 text-red-600 hover:bg-red-50"
              }`}
            >
              Delete
            </button>
            <div className="flex-1" />
            <button
              onClick={() => void handleApply()}
              disabled={applying}
              className="px-4 py-1.5 text-sm rounded-md bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-wait transition-colors whitespace-nowrap"
            >
              {applying ? "Applying…" : "Apply changes"}
            </button>
          </div>
        )}
      </div>

      {/* Collapsible filter panel — grid-rows trick for smooth height animation */}
      <div
        className={`grid transition-all duration-300 ease-out overflow-hidden ${
          filterOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0">
          <div className="border border-gray-200 rounded-lg p-5 bg-gray-50">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
              <MultiPills label="Status" options={[
                { value: "saved", label: "Saved" }, { value: "applied", label: "Applied" },
                { value: "oa", label: "OA" }, { value: "interview", label: "Interview" },
                { value: "offer", label: "Offer" }, { value: "rejected", label: "Rejected" },
                { value: "ghosted", label: "Ghosted" },
              ]} selected={filters.status} onToggle={(v) => toggleSetFilter("status", v)} />

              <MultiPills label="Interest Level" options={[
                { value: "low", label: "Low" }, { value: "medium", label: "Medium" },
                { value: "high", label: "High" }, { value: "very-high", label: "Very High" },
              ]} selected={filters.interestLevel} onToggle={(v) => toggleSetFilter("interestLevel", v)} />

              <MultiPills label="Remote Type" options={[
                { value: "remote", label: "Remote" }, { value: "hybrid", label: "Hybrid" },
                { value: "onsite", label: "Onsite" },
              ]} selected={filters.remoteType} onToggle={(v) => toggleSetFilter("remoteType", v)} />

              <MultiDropdown label="Job Type" placeholder="Any job type" options={[
                { value: "full-time", label: "Full-time" }, { value: "part-time", label: "Part-time" },
                { value: "contract", label: "Contract" }, { value: "internship", label: "Internship" },
                { value: "graduate", label: "Graduate" }, { value: "fixed-term", label: "Fixed-term" },
                { value: "permanent", label: "Permanent" },
              ]} selected={filters.jobType} onToggle={(v) => toggleSetFilter("jobType", v)} />

              <MultiDropdown label="Source" placeholder="Any source" options={allSources}
                selected={filters.source} onToggle={(v) => toggleSetFilter("source", v)} />

              <MultiDropdown label="Tags" placeholder="Any tag" options={allTags}
                selected={filters.tags} onToggle={(v) => toggleSetFilter("tags", v)} />

              <div className="sm:col-span-2 lg:col-span-3">
                <SalarySlider
                  max={maxSalary}
                  minVal={sliderMin}
                  maxVal={sliderMax || maxSalary}
                  includeUnspecified={filters.includeUnspecifiedSalary}
                  onMinChange={(v) => {
                    const newMin = v === 0 ? null : v;
                    setFilters((f) => ({
                      ...f, salaryMin: newMin,
                      includeUnspecifiedSalary: newMin !== null || f.salaryMax !== null ? false : true,
                    }));
                  }}
                  onMaxChange={(v) => {
                    const newMax = v === maxSalary ? null : v;
                    setFilters((f) => ({
                      ...f, salaryMax: newMax,
                      includeUnspecifiedSalary: f.salaryMin !== null || newMax !== null ? false : true,
                    }));
                  }}
                  onIncludeUnspecifiedChange={(v) =>
                    setFilters((f) => ({ ...f, includeUnspecifiedSalary: v }))
                  }
                />
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Saved Date
                </p>
                <div className="flex items-center gap-2">
                  <input type="date" value={filters.savedDateFrom ?? ""}
                    onChange={(e) => setFilters((f) => ({ ...f, savedDateFrom: e.target.value || null }))}
                    className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:border-blue-400" />
                  <span className="text-gray-400 text-sm">–</span>
                  <input type="date" value={filters.savedDateTo ?? ""}
                    onChange={(e) => setFilters((f) => ({ ...f, savedDateTo: e.target.value || null }))}
                    className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:border-blue-400" />
                </div>
              </div>

              <ThreeWayToggle label="Resume Submitted" value={filters.resumeSubmitted}
                onChange={(v) => setFilters((f) => ({ ...f, resumeSubmitted: v }))} />
              <ThreeWayToggle label="Cover Letter" value={filters.coverLetterSubmitted}
                onChange={(v) => setFilters((f) => ({ ...f, coverLetterSubmitted: v }))} />
            </div>

            <div className="mt-5 pt-4 border-t border-gray-200 flex items-center justify-between">
              <span className="text-sm text-gray-500">
                {displayedJobs.length} of {baseJobs.length} job{baseJobs.length !== 1 ? "s" : ""}
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
      {archiveLoading ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm py-8">
          <Loader2 size={16} className="animate-spin" />
          Loading archived jobs…
        </div>
      ) : baseJobs.length === 0 ? (
        <p className="text-gray-600">
          {showArchived ? "No archived jobs." : "No jobs saved yet. Use the extension to save a job."}
        </p>
      ) : displayedJobs.length === 0 ? (
        <p className="text-gray-500">No jobs match your search or filters.</p>
      ) : (
        <div className="overflow-x-auto w-full">
          <table className="w-full text-sm text-gray-900 border-separate border-spacing-0">
            <thead>
              <tr className="text-left">
                <th className="py-2 pb-3 pl-3 pr-3 w-10">
                  <input
                    type="checkbox"
                    checked={allDisplayedSelected}
                    ref={(el) => { if (el) el.indeterminate = someDisplayedSelected; }}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 cursor-pointer"
                  />
                </th>
                <SortHeader column="status" className="w-24">Status</SortHeader>
                <SortHeader column="company" className="w-44">Company</SortHeader>
                <SortHeader column="title" className="w-52">Title</SortHeader>
                {show("location") && <SortHeader column="location" className="w-32">Location</SortHeader>}
                {show("remoteType") && <th className="py-2 pb-3 pr-4 w-20 text-gray-500 text-xs font-semibold uppercase tracking-wide">Remote</th>}
                {show("jobType") && <th className="py-2 pb-3 pr-4 w-24 text-gray-500 text-xs font-semibold uppercase tracking-wide">Job Type</th>}
                {show("salaryRaw") && <SortHeader column="salary" className="w-28">Salary</SortHeader>}
                {show("interestLevel") && <th className="py-2 pb-3 pr-4 w-24 text-gray-500 text-xs font-semibold uppercase tracking-wide">Interest</th>}
                <th className="py-2 pb-3 pr-4 w-20 text-gray-500 text-xs font-semibold uppercase tracking-wide">Source</th>
                {show("appliedAt") && <SortHeader column="appliedAt" className="w-28">Applied</SortHeader>}
                {show("resumeCoverLetter") && <th className="py-2 pb-3 pr-4 w-20 text-gray-500 text-xs font-semibold uppercase tracking-wide">Docs</th>}
                {show("sourceUrl") && <th className="py-2 pb-3 w-10 text-gray-500 text-xs font-semibold uppercase tracking-wide">URL</th>}
              </tr>
            </thead>
            {displayedJobs.map((job) => {
              const isSelected = selectedIds.has(job.id);
              const isOpen     = expandedId === job.id;
              const isClosing  = closingId === job.id;
              const isMounted  = isOpen || isClosing;
              // Keep connected card styling while panel is open or animating closed
              const visuallyExpanded = isOpen || isClosing;

              // Per-cell borders: T+B all cells, L first only, R last only
              const outlineClasses = visuallyExpanded
                ? isSelected
                  ? "[&>td]:border-t [&>td]:border-t-blue-400 [&>td:first-child]:border-l [&>td:first-child]:border-l-blue-400 [&>td:last-child]:border-r [&>td:last-child]:border-r-blue-400"
                  : showArchived
                    ? "[&>td]:border-t [&>td]:border-t-amber-500 [&>td:first-child]:border-l [&>td:first-child]:border-l-amber-500 [&>td:last-child]:border-r [&>td:last-child]:border-r-amber-500"
                    : "[&>td]:border-t [&>td]:border-t-gray-600 [&>td:first-child]:border-l [&>td:first-child]:border-l-gray-600 [&>td:last-child]:border-r [&>td:last-child]:border-r-gray-600"
                : isSelected
                  ? "[&>td]:border-t [&>td]:border-b [&>td]:border-t-blue-400 [&>td]:border-b-blue-400 [&>td:first-child]:border-l [&>td:first-child]:border-l-blue-400 [&>td:last-child]:border-r [&>td:last-child]:border-r-blue-400"
                  : showArchived
                    ? "[&>td]:border-t [&>td]:border-b [&>td]:border-t-amber-500 [&>td]:border-b-amber-500 [&>td:first-child]:border-l [&>td:first-child]:border-l-amber-500 [&>td:last-child]:border-r [&>td:last-child]:border-r-amber-500"
                    : "[&>td]:border-t [&>td]:border-b [&>td]:border-t-gray-600 [&>td]:border-b-gray-600 [&>td:first-child]:border-l [&>td:first-child]:border-l-gray-600 [&>td:last-child]:border-r [&>td:last-child]:border-r-gray-600";

              // Rounded corners on first/last <td> for background clipping
              const cornerClasses = visuallyExpanded
                ? "[&>td:first-child]:rounded-tl-lg [&>td:last-child]:rounded-tr-lg"
                : "[&>td:first-child]:rounded-tl-lg [&>td:first-child]:rounded-bl-lg [&>td:last-child]:rounded-tr-lg [&>td:last-child]:rounded-br-lg";

              // Background only
              const colorClasses = isSelected
                ? "[&>td]:bg-blue-50"
                : highlightedId === job.id
                ? "[&>td]:bg-green-100"
                : fadingId === job.id
                ? "[&>td]:bg-gray-100 [&>td]:transition-colors [&>td]:duration-[600ms]"
                : "[&>td]:bg-gray-100";

              const hoverClass = !isSelected ? "[&:hover>td]:bg-gray-200" : "";
              const rowClass = `cursor-pointer [&>td]:min-h-[72px] ${outlineClasses} ${cornerClasses} ${colorClasses} ${hoverClass}`;

              // Expand panel td: visible + connected when open, invisible when closed
              const expandTdClass = visuallyExpanded
                ? `p-0 border-l border-r border-b ${isSelected ? "border-blue-400" : showArchived ? "border-amber-500" : "border-gray-600"} rounded-bl-lg rounded-br-lg bg-gray-100 overflow-hidden`
                : "p-0 border-0 bg-transparent";

              return (
                <tbody key={job.id}>
                  <tr className={rowClass} onClick={() => toggleExpand(job.id)}>
                    <td className="py-4 pl-3 pr-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(job.id)}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="py-4 pr-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col gap-1.5 items-start">
                        <StatusCell
                          jobId={job.id}
                          status={statusPatch[job.id] ?? job.status}
                          onStatusChange={handleStatusChange}
                          saving={patchingId === job.id}
                        />
                        {showArchived && (
                          <button
                            onClick={() => void handleStillActive(job.id)}
                            disabled={stillActivating.has(job.id)}
                            className="text-xs px-2 py-0.5 rounded border border-amber-400 text-amber-700 hover:bg-amber-50 whitespace-nowrap disabled:opacity-50 disabled:cursor-wait"
                          >
                            {stillActivating.has(job.id) ? "…" : "Still Active"}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-4 pr-3 whitespace-normal break-words leading-snug">{job.company}</td>
                    <td className="py-4 pr-3 whitespace-normal break-words leading-snug text-blue-700">{job.title}</td>
                    {show("location") && (
                      <td className="py-4 pr-3 whitespace-normal break-words">
                        {renderLocation(job.location ?? "")}
                      </td>
                    )}
                    {show("remoteType") && <td className="py-4 pr-3">{job.remoteType ?? "—"}</td>}
                    {show("jobType") && <td className="py-4 pr-3">{job.jobType ?? "—"}</td>}
                    {show("salaryRaw") && (
                      <td className="py-4 pr-3 whitespace-normal break-words">
                        {formatSalaryCell(job.salaryRaw)}
                      </td>
                    )}
                    {show("interestLevel") && (
                      <td className="py-4 pr-3">
                        {job.interestLevel ? (INTEREST_LABELS[job.interestLevel] ?? job.interestLevel) : "—"}
                      </td>
                    )}
                    <td className="py-4 pr-3">{job.source}</td>
                    {show("appliedAt") && <td className="py-4 pr-3">{formatDate(job.appliedAt)}</td>}
                    {show("resumeCoverLetter") && (
                      <td className="py-4 pr-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1 text-xs text-gray-700 cursor-pointer">
                            {patchingDocs.has(`${job.id}-resumeSubmitted`)
                              ? <Loader2 size={12} className="animate-spin text-blue-500 shrink-0" />
                              : <input
                                  type="checkbox"
                                  checked={docsPatch[job.id]?.resumeSubmitted ?? job.resumeSubmitted ?? false}
                                  onChange={(e) => void handleDocChange(job.id, "resumeSubmitted", e.target.checked)}
                                  className="w-4 h-4 shrink-0 cursor-pointer"
                                />
                            }
                            R
                          </label>
                          <label className="flex items-center gap-1 text-xs text-gray-700 cursor-pointer">
                            {patchingDocs.has(`${job.id}-coverLetterSubmitted`)
                              ? <Loader2 size={12} className="animate-spin text-blue-500 shrink-0" />
                              : <input
                                  type="checkbox"
                                  checked={docsPatch[job.id]?.coverLetterSubmitted ?? job.coverLetterSubmitted ?? false}
                                  onChange={(e) => void handleDocChange(job.id, "coverLetterSubmitted", e.target.checked)}
                                  className="w-4 h-4 shrink-0 cursor-pointer"
                                />
                            }
                            CL
                          </label>
                        </div>
                      </td>
                    )}
                    {show("sourceUrl") && (
                      <td className="py-4 pr-3">
                        <a
                          href={job.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={job.sourceUrl}
                          className="text-blue-700 hover:text-blue-900 inline-flex"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink size={16} />
                        </a>
                      </td>
                    )}
                  </tr>
                  {/* Expand panel — always in DOM for smooth open/close animation */}
                  <tr>
                    <td colSpan={99} className={expandTdClass}>
                      <div className={`grid w-full transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                        <div className="min-h-0">
                          {isMounted && (
                            <ExpandedJobPanel
                              job={job}
                              getToken={getToken}
                              onJobPatched={handleJobPatched}
                            />
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                  {/* Spacer — creates the visual gap between cards without border-spacing */}
                  <tr aria-hidden="true">
                    <td colSpan={99} className="h-1 p-0 bg-transparent border-0" />
                  </tr>
                </tbody>
              );
            })}
          </table>
        </div>
      )}

      {/* Confirmation modal */}
      {modal && (
        <ConfirmModal
          type={modal.type}
          count={modal.count}
          onConfirm={(dontAskAgain) => void handleModalConfirm(dontAskAgain)}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  );
}
