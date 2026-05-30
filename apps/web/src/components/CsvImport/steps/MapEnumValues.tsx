"use client";

import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import type { ImportWizardState, EnumFieldKey, EnumMap } from "../types";
import { FIELD_LABELS } from "./MapColumns";

type Props = {
  state: ImportWizardState;
  onUpdate: React.Dispatch<React.SetStateAction<ImportWizardState>>;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const ENUM_FIELD_KEYS: EnumFieldKey[] = [
  "status",
  "remoteType",
  "jobType",
  "interestLevel",
];

const OUR_ENUM_VALUES: Record<EnumFieldKey, string[]> = {
  status:        ["saved", "applied", "oa", "interview", "rejected", "offer", "ghosted"],
  remoteType:    ["remote", "hybrid", "onsite"],
  jobType:       ["full-time", "part-time", "contract", "internship", "graduate", "fixed-term", "permanent"],
  interestLevel: ["low", "medium", "high", "very-high"],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatOurValue(v: string): string {
  return v
    .split("-")
    .map((w) => (w.length <= 2 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

function findBestMatch(csvValue: string, ourValues: string[]): string | null {
  const words = csvValue.toLowerCase().split(/\s+/);
  for (const ourVal of ourValues) {
    const ourWords = ourVal.toLowerCase().replace(/-/g, " ").split(/\s+/);
    for (const word of words) {
      for (const ourWord of ourWords) {
        if (word.includes(ourWord) || ourWord.includes(word)) {
          if (word.length >= 4 && ourWord.length >= 4) return ourVal;
        }
      }
    }
  }
  return null;
}

function buildInitialEnumMap(
  fieldKey: EnumFieldKey,
  colHeader: string,
  csvHeaders: string[],
  rawRows: string[][]
): EnumMap {
  const colIdx = csvHeaders.indexOf(colHeader);
  const seen = new Set<string>();
  for (const row of rawRows) {
    const v = colIdx >= 0 ? row[colIdx]?.trim() : undefined;
    if (v) seen.add(v);
  }

  const ourVals = OUR_ENUM_VALUES[fieldKey];

  // Start with empty mappings for every our-value
  const mappings: EnumMap["mappings"] = {};
  for (const ourVal of ourVals) {
    mappings[ourVal] = { primary: "", aliases: [] };
  }

  // Try to match each CSV value to an our-value
  const assigned = new Set<string>();
  for (const csvVal of seen) {
    const match = findBestMatch(csvVal, ourVals);
    if (match && !assigned.has(match)) {
      mappings[match] = { primary: csvVal, aliases: [] };
      assigned.add(match);
    }
  }

  return { mappings, extraRows: [] };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MapEnumValues({ state, onUpdate }: Props) {
  const { columnMap, enabledFields, rawRows, csvHeaders, enumMaps } = state;

  const mappedEnumFields = ENUM_FIELD_KEYS.filter(
    (key) => enabledFields.has(key) && columnMap[key]
  );

  const [openSections, setOpenSections] = useState<Set<EnumFieldKey>>(
    () => new Set(mappedEnumFields.slice(0, 1))
  );
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [aliasInputs, setAliasInputs] = useState<Record<string, string>>({});

  // Auto-initialise on first mount only
  useEffect(() => {
    let needsUpdate = false;
    const next = { ...state.enumMaps };
    for (const fieldKey of mappedEnumFields) {
      if (next[fieldKey] !== undefined) continue;
      const colHeader = columnMap[fieldKey]!;
      next[fieldKey] = buildInitialEnumMap(fieldKey, colHeader, csvHeaders, rawRows);
      needsUpdate = true;
    }
    if (needsUpdate) onUpdate((s) => ({ ...s, enumMaps: next }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update helpers ────────────────────────────────────────────────────────

  function updateEnumMap(fieldKey: EnumFieldKey, updater: (em: EnumMap) => EnumMap) {
    onUpdate((s) => {
      const existing = s.enumMaps[fieldKey];
      if (!existing) return s;
      return { ...s, enumMaps: { ...s.enumMaps, [fieldKey]: updater(existing) } };
    });
  }

  function setMainPrimary(fieldKey: EnumFieldKey, ourVal: string, value: string) {
    updateEnumMap(fieldKey, (em) => ({
      ...em,
      mappings: { ...em.mappings, [ourVal]: { ...em.mappings[ourVal]!, primary: value } },
    }));
  }

  function addMainAlias(fieldKey: EnumFieldKey, ourVal: string, alias: string) {
    if (!alias.trim()) return;
    updateEnumMap(fieldKey, (em) => ({
      ...em,
      mappings: {
        ...em.mappings,
        [ourVal]: {
          ...em.mappings[ourVal]!,
          aliases: [...(em.mappings[ourVal]?.aliases ?? []), alias.trim()],
        },
      },
    }));
  }

  function removeMainAlias(fieldKey: EnumFieldKey, ourVal: string, aliasIdx: number) {
    updateEnumMap(fieldKey, (em) => ({
      ...em,
      mappings: {
        ...em.mappings,
        [ourVal]: {
          ...em.mappings[ourVal]!,
          aliases: (em.mappings[ourVal]?.aliases ?? []).filter((_, i) => i !== aliasIdx),
        },
      },
    }));
  }

  function addExtraRow(fieldKey: EnumFieldKey) {
    updateEnumMap(fieldKey, (em) => ({
      ...em,
      extraRows: [...em.extraRows, { ourValue: OUR_ENUM_VALUES[fieldKey][0] ?? "", primary: "", aliases: [] }],
    }));
  }

  function removeExtraRow(fieldKey: EnumFieldKey, rowIdx: number) {
    updateEnumMap(fieldKey, (em) => ({
      ...em,
      extraRows: em.extraRows.filter((_, i) => i !== rowIdx),
    }));
  }

  function setExtraOurValue(fieldKey: EnumFieldKey, rowIdx: number, ourVal: string) {
    updateEnumMap(fieldKey, (em) => ({
      ...em,
      extraRows: em.extraRows.map((r, i) => (i === rowIdx ? { ...r, ourValue: ourVal } : r)),
    }));
  }

  function setExtraPrimary(fieldKey: EnumFieldKey, rowIdx: number, value: string) {
    updateEnumMap(fieldKey, (em) => ({
      ...em,
      extraRows: em.extraRows.map((r, i) => (i === rowIdx ? { ...r, primary: value } : r)),
    }));
  }

  function addExtraAlias(fieldKey: EnumFieldKey, rowIdx: number, alias: string) {
    if (!alias.trim()) return;
    updateEnumMap(fieldKey, (em) => ({
      ...em,
      extraRows: em.extraRows.map((r, i) =>
        i === rowIdx ? { ...r, aliases: [...r.aliases, alias.trim()] } : r
      ),
    }));
  }

  function removeExtraAlias(fieldKey: EnumFieldKey, rowIdx: number, aliasIdx: number) {
    updateEnumMap(fieldKey, (em) => ({
      ...em,
      extraRows: em.extraRows.map((r, i) =>
        i === rowIdx ? { ...r, aliases: r.aliases.filter((_, ai) => ai !== aliasIdx) } : r
      ),
    }));
  }

  function toggleSection(fieldKey: EnumFieldKey) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(fieldKey)) next.delete(fieldKey);
      else next.add(fieldKey);
      return next;
    });
  }

  function toggleRow(rowKey: string) {
    setExpandedRows((prev) => ({ ...prev, [rowKey]: !prev[rowKey] }));
  }

  // ── Alias sub-row ─────────────────────────────────────────────────────────

  function AliasRow({
    rowKey,
    aliases,
    onAdd,
    onRemove,
  }: {
    rowKey: string;
    aliases: string[];
    onAdd: (alias: string) => void;
    onRemove: (idx: number) => void;
  }) {
    const input = aliasInputs[rowKey] ?? "";
    return (
      <div className="mt-2 ml-2 pl-3 border-l-2 border-gray-100">
        {aliases.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {aliases.map((alias, ai) => (
              <span
                key={ai}
                className="inline-flex items-center gap-1 bg-gray-100 text-gray-900 text-xs px-2 py-0.5 rounded-full"
              >
                {alias}
                <button type="button" onClick={() => onRemove(ai)} className="text-gray-500 hover:text-red-500">
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Add alias…"
            value={input}
            onChange={(e) => setAliasInputs((prev) => ({ ...prev, [rowKey]: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onAdd(input);
                setAliasInputs((prev) => ({ ...prev, [rowKey]: "" }));
              }
            }}
            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:border-blue-400 text-gray-900"
          />
          <button
            type="button"
            onClick={() => {
              onAdd(input);
              setAliasInputs((prev) => ({ ...prev, [rowKey]: "" }));
            }}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-900 rounded-md hover:bg-gray-200 transition-colors"
          >
            Add
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Add alternative names that also mean this value
        </p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="px-4 py-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Map field values</h2>
      <p className="text-sm text-gray-500 mb-6">
        Tell us which CSV values correspond to each option. Values left unmapped will use a default.
      </p>

      {mappedEnumFields.map((fieldKey) => {
        const enumMap = enumMaps[fieldKey];
        const isOpen = openSections.has(fieldKey);
        const mappedCount = enumMap
          ? Object.values(enumMap.mappings).filter((m) => m.primary).length +
            enumMap.extraRows.length
          : 0;

        return (
          <div key={fieldKey} className="border border-gray-200 rounded-lg overflow-hidden mb-4">
            {/* Accordion header */}
            <button
              onClick={() => toggleSection(fieldKey)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              <span className="text-sm font-medium text-gray-900">
                {FIELD_LABELS[fieldKey]}
                <span className="text-gray-400 font-normal ml-2">
                  ({mappedCount} values detected)
                </span>
              </span>
              {isOpen ? (
                <ChevronUp size={16} className="text-gray-500 shrink-0" />
              ) : (
                <ChevronDown size={16} className="text-gray-500 shrink-0" />
              )}
            </button>

            {isOpen && enumMap && (
              <div className="p-4">
                {/* Column headers */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Maps to (our value)
                  </div>
                  <div className="w-5 shrink-0" />
                  <div className="flex-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Your CSV value
                  </div>
                </div>

                {/* Main rows — one per our enum value */}
                {OUR_ENUM_VALUES[fieldKey].map((ourVal) => {
                  const mapping = enumMap.mappings[ourVal] ?? { primary: "", aliases: [] };
                  const rowKey = `${fieldKey}|${ourVal}`;
                  const isExpanded = !!expandedRows[rowKey];

                  return (
                    <div key={ourVal} className="mb-2">
                      <div className="flex items-start gap-3">
                        {/* Left: our value label */}
                        <div className="flex-1">
                          <div className="px-2 py-1.5 text-sm font-medium text-gray-900 bg-gray-50 border border-gray-200 rounded-md">
                            {formatOurValue(ourVal)}
                          </div>
                        </div>

                        {/* Arrow */}
                        <span className="text-gray-400 mt-2 shrink-0 text-sm">←</span>

                        {/* Right: their CSV value input */}
                        <div className="flex-1">
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={mapping.primary}
                              onChange={(e) => setMainPrimary(fieldKey, ourVal, e.target.value)}
                              placeholder="CSV value…"
                              className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-blue-400 text-gray-900"
                            />
                            <button
                              type="button"
                              onClick={() => toggleRow(rowKey)}
                              title={isExpanded ? "Hide aliases" : "Show aliases"}
                              className="p-1 text-gray-400 hover:text-gray-700 shrink-0"
                            >
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <AliasRow
                          rowKey={rowKey}
                          aliases={mapping.aliases}
                          onAdd={(alias) => addMainAlias(fieldKey, ourVal, alias)}
                          onRemove={(idx) => removeMainAlias(fieldKey, ourVal, idx)}
                        />
                      )}
                    </div>
                  );
                })}

                {/* Extra rows added by user */}
                {enumMap.extraRows.map((extra, rowIdx) => {
                  const rowKey = `${fieldKey}|extra|${rowIdx}`;
                  const isExpanded = !!expandedRows[rowKey];

                  return (
                    <div key={rowIdx} className="mb-2">
                      <div className="flex items-start gap-3">
                        {/* Left: select our value */}
                        <div className="flex-1">
                          <select
                            value={extra.ourValue}
                            onChange={(e) => setExtraOurValue(fieldKey, rowIdx, e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-blue-400 bg-white text-gray-900"
                          >
                            {OUR_ENUM_VALUES[fieldKey].map((v) => (
                              <option key={v} value={v}>{formatOurValue(v)}</option>
                            ))}
                          </select>
                        </div>

                        {/* Arrow */}
                        <span className="text-gray-400 mt-2 shrink-0 text-sm">←</span>

                        {/* Right: CSV value input */}
                        <div className="flex-1">
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={extra.primary}
                              onChange={(e) => setExtraPrimary(fieldKey, rowIdx, e.target.value)}
                              placeholder="CSV value…"
                              className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-blue-400 text-gray-900"
                            />
                            <button
                              type="button"
                              onClick={() => toggleRow(rowKey)}
                              title={isExpanded ? "Hide aliases" : "Show aliases"}
                              className="p-1 text-gray-400 hover:text-gray-700 shrink-0"
                            >
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeExtraRow(fieldKey, rowIdx)}
                              title="Remove this row"
                              className="p-1 text-gray-400 hover:text-red-500 shrink-0"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <AliasRow
                          rowKey={rowKey}
                          aliases={extra.aliases}
                          onAdd={(alias) => addExtraAlias(fieldKey, rowIdx, alias)}
                          onRemove={(idx) => removeExtraAlias(fieldKey, rowIdx, idx)}
                        />
                      )}
                    </div>
                  );
                })}

                {/* Add row button */}
                <button
                  type="button"
                  onClick={() => addExtraRow(fieldKey)}
                  className="mt-1 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <Plus size={14} />
                  Add row
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
