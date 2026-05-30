import type { ImportWizardState } from "./types";

export const initialState: ImportWizardState = {
  step: "upload",
  file: null,
  csvHeaders: [],
  rawRows: [],
  headerRowIndex: 0,
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
