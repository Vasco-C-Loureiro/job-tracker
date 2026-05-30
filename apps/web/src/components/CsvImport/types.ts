export type FieldKey =
  | "location"
  | "remoteType"
  | "jobType"
  | "salaryRaw"
  | "sourceUrl"
  | "source"
  | "status"
  | "notes"
  | "appliedAt"
  | "interestLevel"
  | "tags";

export type EnumFieldKey = "status" | "remoteType" | "jobType" | "interestLevel";

// company and title are always required — tracked in columnMap but not toggleable
export type ColumnMapKey = FieldKey | "company" | "title";

export type EnumMap = {
  // key = our enum value (e.g. "rejected")
  mappings: Record<string, { primary: string; aliases: string[] }>;
  // user-added rows where the same ourValue can appear multiple times
  extraRows: { ourValue: string; primary: string; aliases: string[] }[];
};

export type WizardStep =
  | "upload"
  | "toggle-fields"
  | "map-columns"
  | "map-enums"
  | "toggle-rows"
  | "preview";

export type ImportWizardState = {
  step: WizardStep;
  file: File | null;
  csvHeaders: string[];
  rawRows: string[][];
  headerRowIndex: number;

  enabledFields: Set<FieldKey>;

  columnMap: Partial<Record<ColumnMapKey, string | null>>;

  enumMaps: Partial<Record<EnumFieldKey, EnumMap>>;

  selectedRowIndices: Set<number>;
  autoSkipRejected: boolean;

  editedRows: Record<string, string>[];

  importComplete: boolean;
};

export type ImportRow = {
  company: string;
  title: string;
  location?: string;
  remoteType?: string;
  jobType?: string;
  salaryRaw?: string;
  sourceUrl?: string;
  source?: string;
  status?: string;
  notes?: string;
  appliedAt?: string;
  interestLevel?: string;
  tags?: string[];
};
