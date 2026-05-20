// Application lifecycle status
export type ApplicationStatus =
  | "saved"
  | "applied"
  | "oa"
  | "interview"
  | "rejected"
  | "offer"
  | "ghosted";

// The minimal v0.1 shape — title, company, URL only.
// Will expand to the full SCHEMA.md shape in v1.0.
export type JobApplication = {
  id: string;
  userId: string;

  company: string;
  title: string;
  sourceUrl: string;
  source: string; // auto-detected hostname slug, e.g. "indeed"

  status: ApplicationStatus;

  savedAt: string;   // ISO 8601
  updatedAt: string; // ISO 8601
};

// Shape the extension POSTs to the API on save.
// Subset of JobApplication — server fills in id, userId, status, timestamps.
export type SaveJobPayload = Pick<
  JobApplication,
  "company" | "title" | "sourceUrl" | "source"
>;

// ─── Extension ⇄ content script messaging ───────────────────────

export type ExtractJobRequest = {
  type: "EXTRACT_JOB";
};

export type ExtractJobFailureReason =
  | "not-supported"     // page has no content script registered (synthesized by popup)
  | "extraction-failed"; // content script ran but couldn't find a job

export type ExtractJobResponse =
  | { ok: true; payload: SaveJobPayload }
  | { ok: false; reason: ExtractJobFailureReason };
