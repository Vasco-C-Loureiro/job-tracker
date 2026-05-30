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
  const csv = csvValue.toLowerCase().trim();

  for (const v of ourValues) {
    if (csv === v.toLowerCase().replace(/-/g, " ")) return v;
  }
  for (const v of ourValues) {
    const ourNorm = v.toLowerCase().replace(/-/g, " ");
    if (csv.includes(ourNorm)) return v;
  }
  for (const v of ourValues) {
    const ourNorm = v.toLowerCase().replace(/-/g, " ");
    if (ourNorm.includes(csv)) return v;
  }
  const csvWords = csv.split(/\s+/).filter((w) => w.length >= 3);
  for (const v of ourValues) {
    const ourWords = v.toLowerCase().replace(/-/g, " ").split(/\s+/).filter((w) => w.length >= 3);
    for (const cw of csvWords) {
      for (const ow of ourWords) {
        if (cw.includes(ow) || ow.includes(cw)) return v;
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
  const mappings: EnumMap["mappings"] = {};
  for (const ourVal of ourVals) {
    mappings[ourVal] = { primary: "", aliases: [] };
  }

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

// ── AliasRow — stable top-level component so local state survives re-renders ──

function AliasRow({
  aliases,
  onAdd,
  onRemove,
}: {
  aliases: string[];
  onAdd: (alias: string) => void;
  onRemove: (idx: number) => void;
}) {
  const [aliasInput, setAliasInput] = useState("");

  function commit() {
    if (!aliasInput.trim()) return;
    onAdd(aliasInput.trim());
    setAliasInput("");
  }

  return (
    <div className="mt-2 pt-2 border-t border-gray-100">
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
          value={aliasInput}
          onChange={(e) => setAliasInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
          className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:border-blue-400 bg-white text-gray-900"
        />
        <button
          type="button"
          onClick={commit}
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

// ── AliasPills — chips shown in-line when alias section is collapsed ───────────

function AliasPills({
  aliases,
  onRemove,
}: {
  aliases: string[];
  onRemove: (idx: number) => void;
}) {
  if (aliases.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
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
  );
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
    updateEnumMap(fieldKey, (em) => ({
      ...em,
      mappings: {
        ...em.mappings,
        [ourVal]: {
          ...em.mappings[ourVal]!,
          aliases: [...(em.mappings[ourVal]?.aliases ?? []), alias],
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

  function removeMainRow(fieldKey: EnumFieldKey, ourVal: string) {
    updateEnumMap(fieldKey, (em) => {
      const next = { ...em.mappings };
      delete next[ourVal];
      return { ...em, mappings: next };
    });
  }

  function renameMainRow(fieldKey: EnumFieldKey, oldOurVal: string, newOurVal: string) {
    if (oldOurVal === newOurVal) return;
    updateEnumMap(fieldKey, (em) => {
      const data = em.mappings[oldOurVal] ?? { primary: "", aliases: [] };
      const next = { ...em.mappings };
      delete next[oldOurVal];
      next[newOurVal] = data;
      return { ...em, mappings: next };
    });
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
    updateEnumMap(fieldKey, (em) => ({
      ...em,
      extraRows: em.extraRows.map((r, i) =>
        i === rowIdx ? { ...r, aliases: [...r.aliases, alias] } : r
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
          ? Object.values(enumMap.mappings).filter((m) => m.primary).length + enumMap.extraRows.length
          : 0;

        return (
          <div key={fieldKey} className="border border-gray-200 rounded-lg overflow-hidden mb-4 mx-[10%]">
            <button
              onClick={() => toggleSection(fieldKey)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              <span className="text-sm font-medium text-gray-900">
                {FIELD_LABELS[fieldKey]}
                <span className="text-gray-400 font-normal ml-2">({mappedCount} values detected)</span>
              </span>
              {isOpen ? <ChevronUp size={16} className="text-gray-500 shrink-0" /> : <ChevronDown size={16} className="text-gray-500 shrink-0" />}
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

                {/* Main rows */}
                {Object.entries(enumMap.mappings).map(([ourVal, mapping]) => {
                  const rowKey = `${fieldKey}|${ourVal}`;
                  const isExpanded = !!expandedRows[rowKey];

                  return (
                    <div key={ourVal} className="mb-2">
                      <div className="flex items-start gap-3">
                        {/* Left: select */}
                        <div className="flex-1">
                          <select
                            value={ourVal}
                            onChange={(e) => renameMainRow(fieldKey, ourVal, e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-blue-400 bg-white text-gray-900"
                          >
                            {OUR_ENUM_VALUES[fieldKey].map((v) => (
                              <option key={v} value={v}>{formatOurValue(v)}</option>
                            ))}
                          </select>
                        </div>

                        <span className="text-gray-400 mt-2 shrink-0 text-sm">←</span>

                        {/* Right: CSV input + alias area */}
                        <div className="flex-1">
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={mapping.primary}
                              onChange={(e) => setMainPrimary(fieldKey, ourVal, e.target.value)}
                              placeholder="CSV value…"
                              className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-blue-400 bg-white text-gray-900"
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
                              onClick={() => removeMainRow(fieldKey, ourVal)}
                              title="Remove this row"
                              className="p-1 text-gray-400 hover:text-red-500 shrink-0"
                            >
                              <X size={14} />
                            </button>
                          </div>
                          {/* Collapsed: show alias chips inline */}
                          {!isExpanded && (
                            <AliasPills
                              aliases={mapping.aliases}
                              onRemove={(idx) => removeMainAlias(fieldKey, ourVal, idx)}
                            />
                          )}
                          {/* Expanded: full alias section with add input */}
                          {isExpanded && (
                            <AliasRow
                              aliases={mapping.aliases}
                              onAdd={(alias) => addMainAlias(fieldKey, ourVal, alias)}
                              onRemove={(idx) => removeMainAlias(fieldKey, ourVal, idx)}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Extra rows */}
                {enumMap.extraRows.map((extra, rowIdx) => {
                  const rowKey = `${fieldKey}|extra|${rowIdx}`;
                  const isExpanded = !!expandedRows[rowKey];

                  return (
                    <div key={rowIdx} className="mb-2">
                      <div className="flex items-start gap-3">
                        {/* Left: select */}
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

                        <span className="text-gray-400 mt-2 shrink-0 text-sm">←</span>

                        {/* Right: CSV input + alias area */}
                        <div className="flex-1">
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={extra.primary}
                              onChange={(e) => setExtraPrimary(fieldKey, rowIdx, e.target.value)}
                              placeholder="CSV value…"
                              className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-blue-400 bg-white text-gray-900"
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
                          {!isExpanded && (
                            <AliasPills
                              aliases={extra.aliases}
                              onRemove={(idx) => removeExtraAlias(fieldKey, rowIdx, idx)}
                            />
                          )}
                          {isExpanded && (
                            <AliasRow
                              aliases={extra.aliases}
                              onAdd={(alias) => addExtraAlias(fieldKey, rowIdx, alias)}
                              onRemove={(idx) => removeExtraAlias(fieldKey, rowIdx, idx)}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

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
