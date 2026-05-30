"use client";

import React, { useEffect, useState } from "react";
import { Lock, X } from "lucide-react";
import type { ImportWizardState, FieldKey, ColumnMapKey } from "../types";
import { detectHeaderRow } from "../utils";

type Props = {
  state: ImportWizardState;
  onUpdate: React.Dispatch<React.SetStateAction<ImportWizardState>>;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const FIELD_SYNONYMS: Record<ColumnMapKey, string[]> = {
  company:       ["company", "employer", "organisation", "organization", "firm"],
  title:         ["title", "job title", "role", "position", "job role"],
  location:      ["location", "city", "place", "area", "region"],
  remoteType:    ["remote type", "remote", "work type", "work location", "arrangement"],
  jobType:       ["job type", "employment type", "contract type", "type"],
  salaryRaw:     ["salary", "pay", "compensation", "wage", "package"],
  sourceUrl:     ["url", "link", "job url", "application url", "job link"],
  source:        ["source", "site", "platform", "board", "from"],
  status:        ["status", "stage", "progress", "application status"],
  notes:         ["notes", "comments", "remarks", "memo"],
  appliedAt:     ["applied at", "date applied", "applied", "application date", "submitted"],
  interestLevel: ["interest", "interest level", "priority", "keenness"],
  tags:          ["tags", "labels", "categories", "keywords"],
};

export const FIELD_LABELS: Record<ColumnMapKey, string> = {
  company:       "Company",
  title:         "Title",
  location:      "Location",
  remoteType:    "Remote type",
  jobType:       "Job type",
  salaryRaw:     "Salary",
  sourceUrl:     "Job URL",
  source:        "Source",
  status:        "Status",
  notes:         "Notes",
  appliedAt:     "Date applied",
  interestLevel: "Interest level",
  tags:          "Tags",
};

const FIELD_COLORS: Record<string, string> = {
  company:       "border-violet-500",
  title:         "border-blue-500",
  location:      "border-green-500",
  remoteType:    "border-orange-500",
  jobType:       "border-pink-500",
  salaryRaw:     "border-yellow-500",
  sourceUrl:     "border-teal-500",
  source:        "border-cyan-500",
  status:        "border-red-500",
  notes:         "border-indigo-500",
  appliedAt:     "border-lime-500",
  interestLevel: "border-amber-500",
  tags:          "border-rose-500",
};

const PAGE_SIZE = 30;

// ── Helpers ───────────────────────────────────────────────────────────────────

function findBestHeader(key: ColumnMapKey, headers: string[]): string | null {
  const synonyms = FIELD_SYNONYMS[key];
  for (const header of headers) {
    if (synonyms.includes(header.toLowerCase())) return header;
  }
  return null;
}

function autoMap(headers: string[], enabledFields: Set<FieldKey>): Partial<Record<ColumnMapKey, string | null>> {
  const map: Partial<Record<ColumnMapKey, string | null>> = {};
  const allKeys: ColumnMapKey[] = ["company", "title", ...(Array.from(enabledFields) as FieldKey[])];
  for (const key of allKeys) {
    map[key] = findBestHeader(key, headers);
  }
  return map;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MapColumns({ state, onUpdate }: Props) {
  const { rawRows, csvHeaders, columnMap, enabledFields, headerRowIndex } = state;
  const [selectedField, setSelectedField] = useState<ColumnMapKey | null>(null);
  const [page, setPage] = useState(0);

  // Auto-map on mount if columnMap is empty
  useEffect(() => {
    if (Object.keys(columnMap).length > 0) return;
    const mapped = autoMap(csvHeaders, enabledFields);
    onUpdate((s) => ({ ...s, columnMap: mapped }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // All field keys to show (locked + toggleable)
  const allFieldKeys: ColumnMapKey[] = [
    "company",
    "title",
    ...(Array.from(enabledFields) as FieldKey[]),
  ];

  // Map from header value → which field it's assigned to
  const headerToField = new Map<string, ColumnMapKey>();
  for (const key of allFieldKeys) {
    const h = columnMap[key];
    if (h) headerToField.set(h, key);
  }

  function unlinkField(key: ColumnMapKey) {
    onUpdate((s) => {
      const next = { ...s.columnMap };
      delete next[key];
      return { ...s, columnMap: next };
    });
    if (selectedField === key) setSelectedField(null);
  }

  function linkHeaderToField(header: string) {
    if (!selectedField) return;
    // Unlink any field previously mapped to this header
    onUpdate((s) => {
      const next = { ...s.columnMap };
      // Remove existing binding of this header from any other field
      for (const k of Object.keys(next) as ColumnMapKey[]) {
        if (next[k] === header) delete next[k];
      }
      next[selectedField] = header;
      return { ...s, columnMap: next };
    });
    setSelectedField(null);
  }

  function changeHeaderRow(newIndex: number) {
    const newHeaders = rawRows[newIndex] ?? [];
    const mapped = autoMap(newHeaders, enabledFields);
    onUpdate((s) => ({
      ...s,
      headerRowIndex: newIndex,
      csvHeaders: newHeaders,
      columnMap: mapped,
    }));
    setSelectedField(null);
    setPage(0);
  }

  const totalPages = Math.ceil(rawRows.length / PAGE_SIZE);
  const pageRows = rawRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="px-4 py-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Map your columns</h2>
      <p className="text-sm text-gray-500 mb-6">
        Click a field, then click the matching column header in the table to link them.
      </p>

      {/* ── Field boxes ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2 mb-4">
        {allFieldKeys.map((key) => {
          const isLocked = key === "company" || key === "title";
          const mappedHeader = columnMap[key];
          const isMapped = !!mappedHeader;
          const isSelected = selectedField === key;
          const color = FIELD_COLORS[key] ?? "border-gray-400";

          return (
            <div
              key={key}
              role={isLocked ? undefined : "button"}
              tabIndex={isLocked ? undefined : 0}
              onClick={() => !isLocked && setSelectedField(isSelected ? null : key)}
              onKeyDown={(e) => !isLocked && (e.key === "Enter" || e.key === " ") && setSelectedField(isSelected ? null : key)}
              className={[
                "relative rounded-lg border-2 p-2.5 text-left transition-all select-none",
                isLocked ? "bg-gray-50 opacity-75 cursor-default" : "cursor-pointer",
                isMapped ? color : "border-gray-200",
                isSelected ? "ring-2 ring-offset-2 ring-blue-400" : "",
                !isMapped && !isLocked ? "hover:border-gray-400" : "",
              ].join(" ")}
            >
              <p className="text-xs font-semibold text-gray-800 truncate">
                {FIELD_LABELS[key]}
              </p>
              {isMapped && (
                <p className="text-[10px] text-gray-500 truncate mt-0.5">{mappedHeader}</p>
              )}
              {isLocked && (
                <Lock size={10} className="absolute top-2 right-2 text-gray-400" />
              )}
              {isMapped && !isLocked && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); unlinkField(key); }}
                  className="absolute top-1.5 right-1.5 text-gray-400 hover:text-red-500 transition-colors"
                  title="Unlink"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Status bar ─────────────────────────────────────────────────────── */}
      <div className="min-h-[24px] mb-4 text-sm text-center">
        {selectedField === null ? (
          <span className="text-gray-400 italic">Click a field above to start linking</span>
        ) : (
          <span className="text-blue-600">
            → <strong>{FIELD_LABELS[selectedField]}</strong> selected — now click a column header in the table below to link it
          </span>
        )}
      </div>

      {/* ── Header row indicator ───────────────────────────────────────────── */}
      <div className="mb-2 text-xs text-gray-500">
        <span className="font-medium">Header row:</span>{" "}
        row {headerRowIndex + 1}{" "}
        <span className="text-gray-400">(click any row in the table to change)</span>
      </div>

      {/* ── Raw CSV table ──────────────────────────────────────────────────── */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <tbody>
              {pageRows.map((row, relIdx) => {
                const absIdx = page * PAGE_SIZE + relIdx;
                const isHeaderRow = absIdx === headerRowIndex;

                return (
                  <tr
                    key={absIdx}
                    onClick={() => !isHeaderRow && changeHeaderRow(absIdx)}
                    className={[
                      "border-b border-gray-100 last:border-0",
                      isHeaderRow
                        ? "bg-blue-50"
                        : "hover:bg-gray-50 cursor-pointer",
                    ].join(" ")}
                  >
                    {/* Row number cell */}
                    <td className="px-2 py-1.5 text-gray-400 font-mono text-right w-10 border-r border-gray-200 select-none">
                      {isHeaderRow ? (
                        <span className="text-blue-600 font-semibold text-[9px] uppercase tracking-wide">HDR</span>
                      ) : (
                        absIdx + 1
                      )}
                    </td>

                    {/* Data cells */}
                    {row.map((cell, colIdx) => {
                      const headerValue = csvHeaders[colIdx];
                      const mappedFieldKey = headerValue ? headerToField.get(headerValue) : undefined;
                      const color = mappedFieldKey ? (FIELD_COLORS[mappedFieldKey] ?? "") : "";
                      const isClickableHeader = isHeaderRow && !!selectedField;

                      return (
                        <td
                          key={colIdx}
                          onClick={isClickableHeader ? (e) => { e.stopPropagation(); linkHeaderToField(cell); } : undefined}
                          className={[
                            "px-2 py-1.5 whitespace-nowrap max-w-[180px] truncate",
                            isHeaderRow ? "font-semibold text-gray-800" : "text-gray-600",
                            isHeaderRow && mappedFieldKey ? `border-b-2 ${color}` : "",
                            isHeaderRow && isClickableHeader ? "cursor-pointer hover:bg-blue-100 rounded" : "",
                          ].join(" ")}
                          title={cell}
                        >
                          {cell}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 text-xs border border-gray-300 rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition-colors"
            >
              &larr; Prev
            </button>
            <span className="text-xs text-gray-500">
              Page {page + 1} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="px-3 py-1 text-xs border border-gray-300 rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition-colors"
            >
              Next &rarr;
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
