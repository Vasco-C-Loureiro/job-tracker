"use client";

import { useState } from "react";
import type { ImportWizardState } from "./types";
import { WizardShell } from "./WizardShell";

const initialState: ImportWizardState = {
  step: "upload",
  file: null,
  csvHeaders: [],
  rawRows: [],
  enabledFields: new Set([
    "location",
    "remoteType",
    "jobType",
    "salaryRaw",
    "sourceUrl",
    "status",
    "notes",
    "appliedAt",
    "interestLevel",
    "tags",
  ]),
  columnMap: {},
  enumMaps: {},
  selectedRowIndices: new Set(),
  autoSkipRejected: false,
  editedRows: [],
};

export default function CsvImport() {
  const [state, setState] = useState<ImportWizardState>(initialState);
  return <WizardShell state={state} onUpdate={setState} />;
}
