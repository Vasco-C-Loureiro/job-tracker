"use client";

import React from "react";
import type {
  ImportWizardState,
  WizardStep,
  EnumFieldKey,
  FieldKey,
  ColumnMapKey,
} from "./types";
import { FileUpload } from "./steps/FileUpload";
import { ToggleFields } from "./steps/ToggleFields";
import { MapColumns, FIELD_LABELS } from "./steps/MapColumns";
import { PreviewTable } from "./PreviewTable";

type WizardShellProps = {
  state: ImportWizardState;
  onUpdate: React.Dispatch<React.SetStateAction<ImportWizardState>>;
};

const STEP_ORDER: WizardStep[] = [
  "upload",
  "toggle-fields",
  "map-columns",
  "map-enums",
  "toggle-rows",
  "preview",
];

const ENUM_FIELD_KEYS: EnumFieldKey[] = [
  "status",
  "remoteType",
  "jobType",
  "interestLevel",
];

const NO_PREVIEW_STEPS: WizardStep[] = ["upload", "toggle-rows", "preview"];

function hasEnumFieldsMapped(state: ImportWizardState): boolean {
  return ENUM_FIELD_KEYS.some(
    (key) => state.enabledFields.has(key) && state.columnMap[key] != null
  );
}

function getNextStep(
  current: WizardStep,
  state: ImportWizardState
): WizardStep {
  const idx = STEP_ORDER.indexOf(current);
  if (idx === -1 || idx === STEP_ORDER.length - 1) return current;
  const next = STEP_ORDER[idx + 1];
  if (next === "map-enums" && !hasEnumFieldsMapped(state)) {
    return STEP_ORDER[idx + 2] ?? next;
  }
  return next;
}

function getPrevStep(current: WizardStep, state: ImportWizardState): WizardStep {
  const idx = STEP_ORDER.indexOf(current);
  if (idx <= 0) return current;
  const prev = STEP_ORDER[idx - 1];
  // Skip map-enums going backward too if it would be skipped going forward
  if (prev === "map-enums" && !hasEnumFieldsMapped(state)) {
    return STEP_ORDER[idx - 2] ?? prev;
  }
  return prev;
}

function isNextDisabled(state: ImportWizardState): boolean {
  if (state.step === "map-columns") {
    return !state.columnMap.company || !state.columnMap.title;
  }
  return false;
}

function nextLabel(state: ImportWizardState): string {
  if (state.step === "preview") {
    return `Import ${state.selectedRowIndices.size} rows`;
  }
  return "Next →";
}

function computePreviewColumns(
  state: ImportWizardState
): { key: string; label: string }[] {
  if (state.step === "toggle-fields") {
    return [
      { key: "company", label: "Company" },
      { key: "title", label: "Title" },
      ...Array.from(state.enabledFields).map((k: FieldKey) => ({
        key: k,
        label: FIELD_LABELS[k],
      })),
    ];
  }
  const cols: { key: string; label: string }[] = [];
  if (state.columnMap.company) cols.push({ key: "company", label: "Company" });
  if (state.columnMap.title) cols.push({ key: "title", label: "Title" });
  for (const key of state.enabledFields) {
    if (state.columnMap[key] != null) {
      cols.push({ key, label: FIELD_LABELS[key as ColumnMapKey] });
    }
  }
  return cols;
}

function computePreviewRows(
  state: ImportWizardState
): Record<string, string>[] {
  if (state.step === "toggle-fields") return [];

  return state.rawRows.slice(0, 2).map((raw) => {
    const row: Record<string, string> = {};

    const companyCol = state.columnMap.company;
    if (companyCol) row.company = raw[companyCol] ?? "";

    const titleCol = state.columnMap.title;
    if (titleCol) row.title = raw[titleCol] ?? "";

    for (const key of state.enabledFields) {
      const col = state.columnMap[key];
      if (!col) continue;
      let value = raw[col] ?? "";

      if (state.step === "map-enums") {
        const enumKey = key as EnumFieldKey;
        const enumMap = state.enumMaps[enumKey];
        if (enumMap && value) {
          for (const group of enumMap.userValues) {
            if (
              [group.primary, ...group.aliases].some(
                (a) => a.toLowerCase() === value.toLowerCase()
              )
            ) {
              value = enumMap.mappedTo[group.primary] ?? value;
              break;
            }
          }
        }
      }

      row[key] = value;
    }
    return row;
  });
}

export function WizardShell({ state, onUpdate }: WizardShellProps) {
  function goNext() {
    const next = getNextStep(state.step, state);
    onUpdate((s) => ({ ...s, step: next }));
  }

  function goBack() {
    if (state.step === "toggle-fields") {
      if (!window.confirm("Discard this import and start over?")) return;
      onUpdate((s) => ({ ...s, step: "upload" }));
      return;
    }
    const prev = getPrevStep(state.step, state);
    onUpdate((s) => ({ ...s, step: prev }));
  }

  function renderStep() {
    switch (state.step) {
      case "upload":
        return <FileUpload state={state} onUpdate={onUpdate} />;
      case "toggle-fields":
        return <ToggleFields state={state} onUpdate={onUpdate} />;
      case "map-columns":
        return <MapColumns state={state} onUpdate={onUpdate} />;
      case "map-enums":
        return (
          <div className="p-8 text-gray-500 text-sm">
            Map Enums step (coming soon)
          </div>
        );
      case "toggle-rows":
        return (
          <div className="p-8 text-gray-500 text-sm">
            Toggle Rows step (coming soon)
          </div>
        );
      case "preview":
        return (
          <div className="p-8 text-gray-500 text-sm">
            Preview step (coming soon)
          </div>
        );
    }
  }

  const showNav = state.step !== "upload";
  const showPreview = !NO_PREVIEW_STEPS.includes(state.step);

  return (
    <div className="flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto">
        {renderStep()}

        {showPreview && (
          <div className="mt-6 mb-20 max-w-2xl mx-auto px-4">
            <PreviewTable
              columns={computePreviewColumns(state)}
              rows={computePreviewRows(state)}
              totalRows={state.rawRows.length}
            />
          </div>
        )}
      </div>

      {showNav && (
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
          <button
            onClick={goBack}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            &larr; Back
          </button>
          <button
            onClick={goNext}
            disabled={isNextDisabled(state)}
            className="px-5 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {nextLabel(state)}
          </button>
        </div>
      )}
    </div>
  );
}
