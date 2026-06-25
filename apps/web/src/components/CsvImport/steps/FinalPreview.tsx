"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import type {
  ImportWizardState,
  EnumFieldKey,
  ImportRow,
  ColumnMapKey,
} from "../types";
import { translateEnumValue } from "../utils";
import { initialState } from "../initialState";

type Props = {
  state: ImportWizardState;
  onUpdate: React.Dispatch<React.SetStateAction<ImportWizardState>>;
};

type Substate = "editing" | "success";
type EditableField = "title" | "company" | "status" | "notes";

const PAGE_SIZE = 50;

const VALID_STATUSES = [
  "saved", "applied", "oa", "interview", "rejected", "offer", "ghosted",
] as const;

const STATUS_LABELS: Record<string, string> = {
  saved: "Saved", applied: "Applied", oa: "OA", interview: "Interview",
  offer: "Offer", rejected: "Rejected", ghosted: "Ghosted",
};

function buildImportRows(state: ImportWizardState): ImportRow[] {
  return [...state.selectedRowIndices].sort((a, b) => a - b).map((i) => {
    const raw = state.rawRows[i];

    const get = (field: ColumnMapKey): string => {
      const header = state.columnMap[field];
      if (!header) return "";
      const colIdx = state.csvHeaders.indexOf(header);
      return colIdx >= 0 ? (raw[colIdx] ?? "") : "";
    };

    const translateEnum = (field: EnumFieldKey): string => {
      const rawVal = get(field as ColumnMapKey);
      return translateEnumValue(rawVal, state.enumMaps[field]) ?? rawVal;
    };

    const tagsRaw = get("tags");

    return {
      company: get("company"),
      title: get("title"),
      location: get("location") || undefined,
      remoteType: translateEnum("remoteType") || undefined,
      jobType: translateEnum("jobType") || undefined,
      salaryRaw: get("salaryRaw") || undefined,
      sourceUrl: get("sourceUrl") || undefined,
      source: get("source") || undefined,
      status: translateEnum("status") || undefined,
      notes: get("notes") || undefined,
      appliedAt: get("appliedAt") || undefined,
      interestLevel: translateEnum("interestLevel") || undefined,
      tags: tagsRaw
        ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
        : undefined,
    };
  });
}

export function FinalPreview({ state, onUpdate }: Props) {
  const [substate, setSubstate] = useState<Substate>("editing");
  const [finalRows, setFinalRows] = useState<ImportRow[]>([]);
  const [selectedFinalRows, setSelectedFinalRows] = useState<Set<number>>(new Set<number>());
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [duplicateIndices, setDuplicateIndices] = useState<Set<number>>(new Set());
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowIdx: number; field: EditableField } | null>(null);
  const [page, setPage] = useState(0);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const skippedCount = Math.max(0, state.rawRows.length - state.headerRowIndex - 1) - state.selectedRowIndices.size;

  useEffect(() => {
    const rows = buildImportRows(state);
    setTimeout(() => {
      setFinalRows(rows);
      setSelectedFinalRows(new Set(rows.map((_, i) => i)));
    }, 0);

    async function checkDuplicates() {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: existing } = await supabase
        .from("job_applications")
        .select("company, title")
        .eq("user_id", session.user.id);

      if (!existing) return;
      const pairs = new Set(
        existing.map((r: { company: string; title: string }) =>
          `${r.company}|||${r.title}`.toLowerCase()
        )
      );
      const dupSet = new Set<number>();
      rows.forEach((r, i) => {
        if (pairs.has(`${r.company}|||${r.title}`.toLowerCase())) dupSet.add(i);
      });
      setDuplicateCount(dupSet.size);
      setDuplicateIndices(dupSet);
      setShowDuplicateWarning(dupSet.size > 0);
    }

    void checkDuplicates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync select-all indeterminate state
  useEffect(() => {
    if (selectAllRef.current) {
      const total = finalRows.length;
      const sel = selectedFinalRows.size;
      selectAllRef.current.indeterminate = sel > 0 && sel < total;
    }
  }, [finalRows.length, selectedFinalRows.size]);

  function toggleAllFinalRows() {
    if (selectedFinalRows.size === finalRows.length) {
      setSelectedFinalRows(new Set<number>());
    } else {
      setSelectedFinalRows(new Set(finalRows.map((_, i) => i)));
    }
  }

  function toggleFinalRow(idx: number) {
    setSelectedFinalRows((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  const allDupsDeselected =
    duplicateIndices.size > 0 &&
    Array.from(duplicateIndices).every((i) => !selectedFinalRows.has(i));

  function toggleDuplicateSelection() {
    setSelectedFinalRows((prev) => {
      const next = new Set(prev);
      if (allDupsDeselected) {
        duplicateIndices.forEach((i) => next.add(i));
      } else {
        duplicateIndices.forEach((i) => next.delete(i));
      }
      return next;
    });
  }

  function updateRow(rowIdx: number, patch: Partial<ImportRow>) {
    setFinalRows((prev) =>
      prev.map((r, i) => (i === rowIdx ? { ...r, ...patch } : r))
    );
  }

  async function handleImport() {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const res = await fetch("/api/jobs/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          rows: finalRows.filter((_, i) => selectedFinalRows.has(i)),
          filename: state.file?.name ?? "import.csv",
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
      }

      const data = await res.json() as { inserted: number; skipped: number };
      setResult(data);
      setSubstate("success");
      onUpdate((s) => ({ ...s, importComplete: true }));
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Success screen ────────────────────────────────────────────────────────

  if (substate === "success" && result) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <CheckCircle2 size={64} className="mx-auto mb-4 text-green-500" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Import complete</h2>
        <p className="text-gray-600 mb-1">
          {result.inserted} {result.inserted === 1 ? "job" : "jobs"} added to your tracker
        </p>
        {result.skipped > 0 && (
          <p className="text-sm text-gray-400 mb-6">
            {result.skipped} {result.skipped === 1 ? "row was" : "rows were"} skipped (missing company or title)
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
          <Link
            href="/"
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            View my applications
          </Link>
          <button
            type="button"
            onClick={() => onUpdate(() => ({ ...initialState }))}
            className="px-5 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Import another file
          </button>
        </div>
      </div>
    );
  }

  // ── Editing screen ────────────────────────────────────────────────────────

  const totalPages = Math.ceil(finalRows.length / PAGE_SIZE);
  const startIdx = page * PAGE_SIZE;
  const pageSlice = finalRows.slice(startIdx, startIdx + PAGE_SIZE);

  function EditableCell({
    rowIdx,
    field,
    value,
  }: {
    rowIdx: number;
    field: EditableField;
    value: string;
  }) {
    const isEditing =
      editingCell?.rowIdx === rowIdx && editingCell?.field === field;

    if (!isEditing) {
      return (
        <span
          className="block truncate cursor-text hover:bg-blue-50 rounded px-1 -mx-1 transition-colors"
          title={value || undefined}
          onClick={() => setEditingCell({ rowIdx, field })}
        >
          {value || <span className="text-gray-300">—</span>}
        </span>
      );
    }

    if (field === "status") {
      return (
        <select
          autoFocus
          value={value}
          onChange={(e) => updateRow(rowIdx, { status: e.target.value })}
          onBlur={() => setEditingCell(null)}
          className="w-full px-1 py-0.5 text-sm border border-blue-400 rounded focus:outline-none bg-white"
        >
          {VALID_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      );
    }

    if (field === "notes") {
      return (
        <textarea
          autoFocus
          rows={2}
          value={value}
          onChange={(e) => updateRow(rowIdx, { notes: e.target.value })}
          onBlur={() => setEditingCell(null)}
          className="w-full px-1 py-0.5 text-sm border border-blue-400 rounded focus:outline-none resize-none"
        />
      );
    }

    return (
      <input
        autoFocus
        type="text"
        value={value}
        onChange={(e) =>
          updateRow(rowIdx, { [field]: e.target.value } as Partial<ImportRow>)
        }
        onBlur={() => setEditingCell(null)}
        onKeyDown={(e) => e.key === "Enter" && setEditingCell(null)}
        className="w-full px-1 py-0.5 text-sm border border-blue-400 rounded focus:outline-none"
      />
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Duplicate warning banner */}
      {showDuplicateWarning && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-3">
          <span className="text-amber-600 shrink-0">⚠</span>
          <p className="flex-1 text-sm text-amber-800">
            {duplicateCount} {duplicateCount === 1 ? "row" : "rows"} may already exist in your
            tracker — highlighted with an orange stripe. They will still be imported unless you
            deselect them.
          </p>
          <button
            type="button"
            onClick={() => setShowDuplicateWarning(false)}
            className="text-amber-500 hover:text-amber-700 shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Deselect duplicates toggle */}
      {duplicateCount > 0 && (
        <div className="mb-4">
          <button
            type="button"
            onClick={toggleDuplicateSelection}
            className={`text-sm px-3 py-1.5 rounded-md border transition-colors ${
              allDupsDeselected
                ? "bg-amber-100 text-amber-800 border-amber-300"
                : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
            }`}
          >
            {allDupsDeselected ? "Re-select duplicates" : "Deselect all duplicates"}
          </button>
        </div>
      )}

      {/* Summary bar */}
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-4 flex-wrap">
        <span className="font-medium text-gray-900">
          Importing {selectedFinalRows.size} {selectedFinalRows.size === 1 ? "row" : "rows"}
        </span>
        {skippedCount > 0 && (
          <>
            <span className="text-gray-400">·</span>
            <span>{skippedCount} skipped</span>
          </>
        )}
        {duplicateCount > 0 && (
          <>
            <span className="text-gray-400">·</span>
            <span className="text-orange-500">{duplicateCount} may be duplicates</span>
          </>
        )}
      </div>

      {/* Editable table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden mb-4 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-gray-900">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="w-10 px-3 py-2.5">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={selectedFinalRows.size === finalRows.length && finalRows.length > 0}
                    onChange={toggleAllFinalRows}
                    className="w-4 h-4 cursor-pointer"
                  />
                </th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-900 whitespace-nowrap">Title</th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-900 whitespace-nowrap">Company</th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-900 whitespace-nowrap">Status</th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-900 whitespace-nowrap">Notes</th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-900 whitespace-nowrap">Location</th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-900 whitespace-nowrap">Applied</th>
                <th className="w-10 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {pageSlice.map((row, relIdx) => {
                const rowIdx = startIdx + relIdx;
                const isDuplicate = duplicateIndices.has(rowIdx);
                const isSelected = selectedFinalRows.has(rowIdx);
                return (
                  <tr
                    key={rowIdx}
                    style={isDuplicate ? { borderLeft: "6px solid #fb923c" } : undefined}
                    className={`border-b border-gray-100 last:border-0 ${isSelected ? "hover:bg-gray-50" : "opacity-40"}`}
                  >
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleFinalRow(rowIdx)}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="pl-4 pr-3 py-2 max-w-[200px]">
                      <EditableCell rowIdx={rowIdx} field="title" value={row.title} />
                    </td>
                    <td className="px-3 py-2 max-w-[160px]">
                      <EditableCell rowIdx={rowIdx} field="company" value={row.company} />
                    </td>
                    <td className="px-3 py-2 w-36">
                      <EditableCell rowIdx={rowIdx} field="status" value={row.status ?? ""} />
                    </td>
                    <td className="px-3 py-2 max-w-[200px]">
                      <EditableCell rowIdx={rowIdx} field="notes" value={row.notes ?? ""} />
                    </td>
                    <td className="px-3 py-2 max-w-[140px]">
                      <span className="block truncate text-gray-900" title={row.location}>
                        {row.location || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2 max-w-[120px]">
                      <span className="block truncate text-gray-900" title={row.appliedAt}>
                        {row.appliedAt || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center w-10">
                      {isDuplicate && (
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 text-sm text-gray-900 border border-gray-300 rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition-colors"
            >
              &larr; Prev
            </button>
            <span className="text-sm text-gray-600">
              Page {page + 1} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="px-3 py-1.5 text-sm text-gray-900 border border-gray-300 rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition-colors"
            >
              Next &rarr;
            </button>
          </div>
        )}
      </div>

      {/* Import button */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => void handleImport()}
          disabled={isSubmitting || selectedFinalRows.size === 0}
          className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting && (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          )}
          Import {selectedFinalRows.size} {selectedFinalRows.size === 1 ? "row" : "rows"}
        </button>
        {submitError && (
          <p className="text-sm text-red-600">{submitError}</p>
        )}
      </div>
    </div>
  );
}
