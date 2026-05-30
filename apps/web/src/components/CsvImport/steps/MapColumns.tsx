"use client";

import React, { useEffect, useRef, useState } from "react";
import type { ImportWizardState, FieldKey, ColumnMapKey } from "../types";

type Props = {
  state: ImportWizardState;
  onUpdate: React.Dispatch<React.SetStateAction<ImportWizardState>>;
};

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

function findBestHeader(key: ColumnMapKey, headers: string[]): string | null {
  const synonyms = FIELD_SYNONYMS[key];
  for (const header of headers) {
    if (synonyms.includes(header.toLowerCase())) return header;
  }
  return null;
}

function getSampleValues(header: string, rows: Record<string, string>[], max = 3): string[] {
  const vals: string[] = [];
  for (const row of rows) {
    const v = row[header];
    if (v?.trim()) {
      vals.push(v.trim());
      if (vals.length >= max) break;
    }
  }
  return vals;
}

function ColumnSelect({
  fieldKey,
  label,
  required,
  headers,
  value,
  rawRows,
  onChange,
}: {
  fieldKey: ColumnMapKey;
  label: string;
  required: boolean;
  headers: string[];
  value: string | null | undefined;
  rawRows: Record<string, string>[];
  onChange: (v: string | null) => void;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = value ?? "";
  const hasError = required && !selected;
  const samples = selected ? getSampleValues(selected, rawRows) : [];

  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-2.5 pr-6 text-sm font-medium text-gray-800 whitespace-nowrap align-top pt-3 w-44">
        {label}
        {required && (
          <span className="ml-1 text-xs text-red-500 font-normal">(required)</span>
        )}
      </td>
      <td className="py-2.5">
        <div
          ref={containerRef}
          className="relative inline-block w-full max-w-xs"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <select
            value={selected}
            onChange={(e) => onChange(e.target.value || null)}
            onFocus={() => setShowTooltip(true)}
            onBlur={() => setShowTooltip(false)}
            className={`w-full px-3 py-1.5 text-sm border rounded-md focus:outline-none transition-colors ${
              hasError
                ? "border-red-400 focus:border-red-500 bg-red-50"
                : "border-gray-300 focus:border-blue-400 bg-white"
            }`}
          >
            <option value="">-- Not in my file --</option>
            {headers.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>

          {showTooltip && selected && samples.length > 0 && (
            <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-md shadow-lg p-2 min-w-[160px] max-w-xs pointer-events-none">
              <p className="text-xs text-gray-400 mb-1 font-medium">Sample values</p>
              {samples.map((s, i) => (
                <p key={i} className="text-xs text-gray-700 truncate">
                  {s}
                </p>
              ))}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

export function MapColumns({ state, onUpdate }: Props) {
  const { csvHeaders, rawRows, columnMap, enabledFields } = state;

  useEffect(() => {
    if (Object.keys(columnMap).length > 0) return;

    const autoMap: Partial<Record<ColumnMapKey, string | null>> = {};
    const allKeys: ColumnMapKey[] = [
      "company",
      "title",
      ...(Array.from(enabledFields) as FieldKey[]),
    ];
    for (const key of allKeys) {
      autoMap[key] = findBestHeader(key, csvHeaders);
    }
    onUpdate((s) => ({ ...s, columnMap: autoMap }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setColumnMap(key: ColumnMapKey, value: string | null) {
    onUpdate((s) => ({ ...s, columnMap: { ...s.columnMap, [key]: value } }));
  }

  const enabledList = Array.from(enabledFields) as FieldKey[];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-1">
        Map your columns
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Match your spreadsheet columns to the tracker&apos;s fields. Required
        fields must be mapped.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 pr-6 text-xs font-semibold text-gray-500 uppercase tracking-wide w-44">
                Our field
              </th>
              <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Your column
              </th>
            </tr>
          </thead>
          <tbody>
            {(["company", "title"] as ColumnMapKey[]).map((key) => (
              <ColumnSelect
                key={key}
                fieldKey={key}
                label={FIELD_LABELS[key]}
                required
                headers={csvHeaders}
                value={columnMap[key]}
                rawRows={rawRows}
                onChange={(v) => setColumnMap(key, v)}
              />
            ))}
            {enabledList.map((key) => (
              <ColumnSelect
                key={key}
                fieldKey={key}
                label={FIELD_LABELS[key]}
                required={false}
                headers={csvHeaders}
                value={columnMap[key]}
                rawRows={rawRows}
                onChange={(v) => setColumnMap(key, v)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
