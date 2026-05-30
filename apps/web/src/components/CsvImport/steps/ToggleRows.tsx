"use client";

import React, { useMemo, useRef, useEffect, useState } from "react";
import type { ImportWizardState, ColumnMapKey } from "../types";
import { translateEnumValue } from "../utils";

type Props = {
  state: ImportWizardState;
  onUpdate: React.Dispatch<React.SetStateAction<ImportWizardState>>;
};

type DisplayRow = {
  index: number;
  title: string;
  company: string;
  location: string;
  status: string;
  salary: string;
  appliedAt: string;
};

const PAGE_SIZE = 50;

const STATUS_BADGE: Record<string, string> = {
  saved:     "bg-gray-100 text-gray-600",
  applied:   "bg-blue-100 text-blue-700",
  oa:        "bg-violet-100 text-violet-700",
  interview: "bg-amber-100 text-amber-700",
  offer:     "bg-green-100 text-green-700",
  rejected:  "bg-red-100 text-red-600",
  ghosted:   "bg-gray-100 text-gray-400",
};

const STATUS_LABELS: Record<string, string> = {
  saved:     "Saved",
  applied:   "Applied",
  oa:        "OA",
  interview: "Interview",
  offer:     "Offer",
  rejected:  "Rejected",
  ghosted:   "Ghosted",
};

export function ToggleRows({ state, onUpdate }: Props) {
  const { rawRows, columnMap, csvHeaders, enumMaps, selectedRowIndices, autoSkipRejected } =
    state;

  const [page, setPage] = useState(0);
  // Tracks which indices were auto-deselected so we can restore exactly them on toggle off
  const [autoSkippedIndices, setAutoSkippedIndices] = useState<Set<number>>(
    new Set()
  );
  const selectAllRef = useRef<HTMLInputElement>(null);

  const displayRows = useMemo<DisplayRow[]>(() => {
    return rawRows.map((raw, index) => {
      function resolve(key: ColumnMapKey): string {
        const col = columnMap[key];
        if (!col) return "";
        const colIdx = csvHeaders.indexOf(col);
        return colIdx >= 0 ? (raw[colIdx] ?? "") : "";
      }

      const rawStatus = resolve("status");
      const status =
        translateEnumValue(rawStatus, enumMaps.status) ?? rawStatus;

      return {
        index,
        company: resolve("company"),
        title: resolve("title"),
        location: resolve("location"),
        status,
        salary: resolve("salaryRaw"),
        appliedAt: resolve("appliedAt"),
      };
    });
  }, [rawRows, columnMap, csvHeaders, enumMaps]);

  const dataRowCount = rawRows.length - (state.headerRowIndex + 1);
  const allSelected = selectedRowIndices.size === dataRowCount;
  const isPartial =
    selectedRowIndices.size > 0 && selectedRowIndices.size < dataRowCount;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = isPartial;
    }
  }, [isPartial]);

  function toggleAll() {
    onUpdate((s) => ({
      ...s,
      selectedRowIndices: allSelected
        ? new Set<number>()
        : new Set(s.rawRows.map((_, i) => i).filter(i => i > s.headerRowIndex)),
    }));
  }

  function toggleRow(index: number) {
    onUpdate((s) => {
      const next = new Set(s.selectedRowIndices);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return { ...s, selectedRowIndices: next };
    });
  }

  function handleAutoSkip() {
    if (!autoSkipRejected) {
      const rejectedIndices = new Set(
        displayRows
          .filter((r) => r.status === "rejected")
          .map((r) => r.index)
      );
      setAutoSkippedIndices(rejectedIndices);
      onUpdate((s) => {
        const next = new Set(s.selectedRowIndices);
        rejectedIndices.forEach((i) => next.delete(i));
        return { ...s, selectedRowIndices: next, autoSkipRejected: true };
      });
    } else {
      onUpdate((s) => {
        const next = new Set(s.selectedRowIndices);
        autoSkippedIndices.forEach((i) => next.add(i));
        return { ...s, selectedRowIndices: next, autoSkipRejected: false };
      });
      setAutoSkippedIndices(new Set());
    }
  }

  const totalPages = Math.ceil(rawRows.length / PAGE_SIZE);
  const pageRows = displayRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Top controls */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-700">
          <input
            ref={selectAllRef}
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="w-4 h-4 cursor-pointer"
          />
          {allSelected ? "Deselect all" : "Select all"}
        </label>

        <div className="flex-1" />

        <span className="text-sm text-gray-600">
          <span className="font-medium">{selectedRowIndices.size}</span> of{" "}
          <span className="font-medium">{dataRowCount}</span> rows selected
        </span>

        <button
          type="button"
          onClick={handleAutoSkip}
          className={`text-sm px-3 py-1.5 rounded-md border transition-colors whitespace-nowrap ${
            autoSkipRejected
              ? "bg-amber-100 text-amber-800 border-amber-300"
              : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
          }`}
        >
          {autoSkipRejected ? "Auto-skipping rejected ✓" : "Auto-skip rejected"}
        </button>
      </div>

      {/* Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="w-10 px-3 py-2.5" />
                <th className="text-left px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">
                  Title
                </th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">
                  Company
                </th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">
                  Location
                </th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">
                  Status
                </th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">
                  Salary
                </th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">
                  Applied
                </th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => {
                const isSelected = selectedRowIndices.has(row.index);
                const badgeClass =
                  STATUS_BADGE[row.status] ?? "bg-gray-100 text-gray-600";
                const statusLabel =
                  STATUS_LABELS[row.status] ?? row.status;

                return (
                  <tr
                    key={row.index}
                    onClick={() => toggleRow(row.index)}
                    className={`border-b border-gray-100 last:border-0 cursor-pointer transition-opacity ${
                      isSelected
                        ? "bg-white hover:bg-gray-50"
                        : "opacity-40 bg-gray-50 hover:opacity-60"
                    }`}
                  >
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(row.index)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-2 max-w-[200px]">
                      <span
                        className="block truncate text-blue-700"
                        title={row.title || undefined}
                      >
                        {row.title || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2 max-w-[160px]">
                      <span
                        className="block truncate"
                        title={row.company || undefined}
                      >
                        {row.company || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2 max-w-[140px]">
                      <span
                        className="block truncate text-gray-600"
                        title={row.location || undefined}
                      >
                        {row.location || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {row.status ? (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}
                        >
                          {statusLabel}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 max-w-[120px]">
                      <span
                        className="block truncate text-gray-600"
                        title={row.salary || undefined}
                      >
                        {row.salary || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2 max-w-[140px]">
                      <span
                        className="block truncate text-gray-500"
                        title={row.appliedAt || undefined}
                      >
                        {row.appliedAt || "—"}
                      </span>
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
    </div>
  );
}
