"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import type {
  ImportWizardState,
  EnumFieldKey,
  EnumMap,
  AliasGroup,
} from "../types";
import { FIELD_LABELS } from "./MapColumns";

type Props = {
  state: ImportWizardState;
  onUpdate: React.Dispatch<React.SetStateAction<ImportWizardState>>;
};

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

export function MapEnumValues({ state, onUpdate }: Props) {
  const { columnMap, enabledFields, rawRows, enumMaps } = state;

  const mappedEnumFields = ENUM_FIELD_KEYS.filter(
    (key) => enabledFields.has(key) && columnMap[key]
  );

  const [openSections, setOpenSections] = useState<Set<EnumFieldKey>>(
    () => new Set(mappedEnumFields.slice(0, 1))
  );
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [aliasInputs, setAliasInputs] = useState<Record<string, string>>({});
  const newGroupRef = useRef<Record<string, HTMLInputElement | null>>({});

  // Auto-initialise enumMaps on first mount only
  useEffect(() => {
    let needsUpdate = false;
    const next = { ...state.enumMaps };

    for (const fieldKey of mappedEnumFields) {
      if (next[fieldKey] !== undefined) continue;

      const colHeader = columnMap[fieldKey]!;
      const seen = new Set<string>();
      for (const row of rawRows) {
        const v = row[colHeader]?.trim();
        if (v) seen.add(v);
      }

      const userValues: AliasGroup[] = Array.from(seen).map((v) => ({
        primary: v,
        aliases: [],
      }));

      const mappedTo: Record<string, string> = {};
      for (const group of userValues) {
        const lc = group.primary.toLowerCase();
        const match = OUR_ENUM_VALUES[fieldKey].find((v) => v === lc);
        if (match) mappedTo[group.primary] = match;
      }

      next[fieldKey] = { userValues, mappedTo };
      needsUpdate = true;
    }

    if (needsUpdate) onUpdate((s) => ({ ...s, enumMaps: next }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function updateEnumMap(fieldKey: EnumFieldKey, updater: (em: EnumMap) => EnumMap) {
    onUpdate((s) => {
      const existing = s.enumMaps[fieldKey];
      if (!existing) return s;
      return { ...s, enumMaps: { ...s.enumMaps, [fieldKey]: updater(existing) } };
    });
  }

  function renamePrimary(fieldKey: EnumFieldKey, idx: number, next: string) {
    updateEnumMap(fieldKey, (em) => {
      const old = em.userValues[idx].primary;
      const userValues = em.userValues.map((g, i) =>
        i === idx ? { ...g, primary: next } : g
      );
      const mappedTo = { ...em.mappedTo };
      if (old in mappedTo) {
        mappedTo[next] = mappedTo[old];
        delete mappedTo[old];
      }
      return { userValues, mappedTo };
    });
  }

  function deleteGroup(fieldKey: EnumFieldKey, idx: number) {
    updateEnumMap(fieldKey, (em) => {
      const primary = em.userValues[idx].primary;
      const userValues = em.userValues.filter((_, i) => i !== idx);
      const mappedTo = { ...em.mappedTo };
      delete mappedTo[primary];
      return { userValues, mappedTo };
    });
  }

  function addAlias(fieldKey: EnumFieldKey, idx: number, alias: string) {
    if (!alias.trim()) return;
    updateEnumMap(fieldKey, (em) => ({
      ...em,
      userValues: em.userValues.map((g, i) =>
        i === idx ? { ...g, aliases: [...g.aliases, alias.trim()] } : g
      ),
    }));
  }

  function removeAlias(fieldKey: EnumFieldKey, groupIdx: number, aliasIdx: number) {
    updateEnumMap(fieldKey, (em) => ({
      ...em,
      userValues: em.userValues.map((g, i) =>
        i === groupIdx
          ? { ...g, aliases: g.aliases.filter((_, ai) => ai !== aliasIdx) }
          : g
      ),
    }));
  }

  function setMapping(fieldKey: EnumFieldKey, primary: string, ourValue: string) {
    updateEnumMap(fieldKey, (em) => {
      const mappedTo = { ...em.mappedTo };
      if (ourValue) mappedTo[primary] = ourValue;
      else delete mappedTo[primary];
      return { ...em, mappedTo };
    });
  }

  function addGroup(fieldKey: EnumFieldKey) {
    updateEnumMap(fieldKey, (em) => ({
      ...em,
      userValues: [...em.userValues, { primary: "", aliases: [] }],
    }));
    // Focus the new input on next render
    setTimeout(() => {
      const key = `${fieldKey}-new`;
      newGroupRef.current[key]?.focus();
    }, 0);
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

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-1">
        Map field values
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Tell us how your values map to ours. Values left unmapped will be set
        to a default.
      </p>

      {mappedEnumFields.map((fieldKey) => {
        const enumMap = enumMaps[fieldKey];
        const isOpen = openSections.has(fieldKey);
        const valueCount = enumMap?.userValues.length ?? 0;

        return (
          <div
            key={fieldKey}
            className="border border-gray-200 rounded-lg overflow-hidden mb-4"
          >
            {/* Accordion header */}
            <button
              onClick={() => toggleSection(fieldKey)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              <span className="text-sm font-medium text-gray-800">
                {FIELD_LABELS[fieldKey]}
                <span className="text-gray-400 font-normal ml-2">
                  ({valueCount} values detected)
                </span>
              </span>
              {isOpen ? (
                <ChevronUp size={16} className="text-gray-500 shrink-0" />
              ) : (
                <ChevronDown size={16} className="text-gray-500 shrink-0" />
              )}
            </button>

            {/* Accordion body */}
            {isOpen && enumMap && (
              <div className="p-4">
                {/* Column headers */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Your values
                  </div>
                  <div className="w-5 shrink-0" />
                  <div className="flex-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Maps to
                  </div>
                </div>

                {/* Value rows */}
                {enumMap.userValues.map((group, groupIdx) => {
                  const rowKey = `${fieldKey}-${groupIdx}`;
                  const isExpanded = !!expandedRows[rowKey];
                  const aliasInput = aliasInputs[rowKey] ?? "";
                  const isNewGroup =
                    groupIdx === enumMap.userValues.length - 1 && group.primary === "";

                  return (
                    <div key={rowKey} className="mb-2">
                      {/* Main row */}
                      <div className="flex items-start gap-3">
                        {/* Left: primary input + expand + delete */}
                        <div className="flex-1">
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={group.primary}
                              onChange={(e) =>
                                renamePrimary(fieldKey, groupIdx, e.target.value)
                              }
                              ref={(el) => {
                                if (isNewGroup)
                                  newGroupRef.current[`${fieldKey}-new`] = el;
                              }}
                              placeholder="Value…"
                              className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-blue-400"
                            />
                            <button
                              type="button"
                              onClick={() => toggleRow(rowKey)}
                              title={isExpanded ? "Hide aliases" : "Show aliases"}
                              className="p-1 text-gray-400 hover:text-gray-700 shrink-0"
                            >
                              {isExpanded ? (
                                <ChevronUp size={14} />
                              ) : (
                                <ChevronDown size={14} />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteGroup(fieldKey, groupIdx)}
                              title="Remove this value"
                              className="p-1 text-gray-400 hover:text-red-500 shrink-0"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Arrow */}
                        <span className="text-gray-400 mt-2 shrink-0 text-sm">→</span>

                        {/* Right: our value select */}
                        <div className="flex-1">
                          <select
                            value={enumMap.mappedTo[group.primary] ?? ""}
                            onChange={(e) =>
                              setMapping(fieldKey, group.primary, e.target.value)
                            }
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-blue-400 bg-white"
                          >
                            <option value="">-- Not mapped --</option>
                            {OUR_ENUM_VALUES[fieldKey].map((v) => (
                              <option key={v} value={v}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Aliases sub-row */}
                      {isExpanded && (
                        <div className="mt-2 ml-2 pl-3 border-l-2 border-gray-100">
                          {group.aliases.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {group.aliases.map((alias, ai) => (
                                <span
                                  key={ai}
                                  className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full"
                                >
                                  {alias}
                                  <button
                                    type="button"
                                    onClick={() => removeAlias(fieldKey, groupIdx, ai)}
                                    className="text-gray-400 hover:text-red-500"
                                  >
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
                              onChange={(e) =>
                                setAliasInputs((prev) => ({
                                  ...prev,
                                  [rowKey]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  addAlias(fieldKey, groupIdx, aliasInput);
                                  setAliasInputs((prev) => ({
                                    ...prev,
                                    [rowKey]: "",
                                  }));
                                }
                              }}
                              className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:border-blue-400"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                addAlias(fieldKey, groupIdx, aliasInput);
                                setAliasInputs((prev) => ({
                                  ...prev,
                                  [rowKey]: "",
                                }));
                              }}
                              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                            >
                              Add
                            </button>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            Add alternative names (e.g. &apos;in-person&apos; alongside &apos;In
                            Person&apos;)
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add value button */}
                <button
                  type="button"
                  onClick={() => addGroup(fieldKey)}
                  className="mt-1 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <Plus size={14} />
                  Add value
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
