"use client";

import React from "react";
import type { ImportWizardState, WizardStep, EnumFieldKey } from "./types";
import { FileUpload } from "./steps/FileUpload";

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

const ENUM_FIELD_KEYS: EnumFieldKey[] = ["status", "remoteType", "jobType", "interestLevel"];

function hasEnumFieldsMapped(state: ImportWizardState): boolean {
  return ENUM_FIELD_KEYS.some(
    (key) => state.enabledFields.has(key) && state.columnMap[key] != null
  );
}

function getNextStep(current: WizardStep, state: ImportWizardState): WizardStep {
  const idx = STEP_ORDER.indexOf(current);
  if (idx === -1 || idx === STEP_ORDER.length - 1) return current;
  const next = STEP_ORDER[idx + 1];
  if (next === "map-enums" && !hasEnumFieldsMapped(state)) {
    return STEP_ORDER[idx + 2] ?? next;
  }
  return next;
}

function getPrevStep(current: WizardStep): WizardStep {
  const idx = STEP_ORDER.indexOf(current);
  if (idx <= 0) return current;
  return STEP_ORDER[idx - 1];
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
    // When going back from map-enums, we skip it in reverse too
    const prev = getPrevStep(state.step);
    onUpdate((s) => ({ ...s, step: prev }));
  }

  function renderStep() {
    switch (state.step) {
      case "upload":
        return <FileUpload state={state} onUpdate={onUpdate} />;
      case "toggle-fields":
        return (
          <div className="p-8 text-gray-500 text-sm">
            Toggle Fields step (coming soon)
          </div>
        );
      case "map-columns":
        return (
          <div className="p-8 text-gray-500 text-sm">
            Map Columns step (coming soon)
          </div>
        );
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

  return (
    <div className="flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto">{renderStep()}</div>

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
