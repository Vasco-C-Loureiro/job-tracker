// Application lifecycle status
export type ApplicationStatus =
  | "saved"
  | "applied"
  | "oa"
  | "interview"
  | "rejected"
  | "offer"
  | "ghosted";

export type RemoteType = "remote" | "hybrid" | "onsite";

export type JobType =
  | "full-time"
  | "part-time"
  | "contract"
  | "internship"
  | "graduate"
  | "fixed-term"
  | "permanent";

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

  location?: string;
  remoteType?: RemoteType;
  jobType?: JobType;
  salaryRaw?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryRequested?: string;
  description?: string;

  savedAt: string;   // ISO 8601
  updatedAt: string; // ISO 8601

  notes?: string;
  appliedAt?: string; // ISO 8601
  interestLevel?: "low" | "medium" | "high" | "very-high";
  tags?: string[];
  resumeSubmitted?: boolean;
  coverLetterSubmitted?: boolean;
  companyApplicationUrl?: string;
  isArchived: boolean;
  archivedAt?: string | null;
  currentInterviewRound?: number;
};

export type UserPreferences = {
  userId: string;
  autoArchiveInactiveEnabled: boolean;
  autoArchiveInactiveDays: number;
  autoArchiveRejectedEnabled: boolean;
  autoArchiveRejectedDays: number;
};

export type JobApplicationListItem = Omit<JobApplication, "description">;

// Shape the extension POSTs to the API on save.
// Subset of JobApplication — server fills in id, userId, status, timestamps.
export type SaveJobPayload = Pick<
  JobApplication,
  | "company"
  | "title"
  | "sourceUrl"
  | "source"
  | "location"
  | "remoteType"
  | "jobType"
  | "salaryRaw"
  | "salaryMin"
  | "salaryMax"
  | "salaryCurrency"
  | "salaryRequested"
  | "description"
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

export { parseSalary, normalizeUrl } from "./utils";

// ─── Notifications ───────────────────────────────────────────────────────────

export type NotificationLinkType =
  | 'job_detail'
  | 'archived_page'
  | 'interview_page'
  | 'none'

export type NotificationEventType =
  | 'auto_archived_inactive'
  | 'auto_archived_rejected'
  | 'status_changed'
  | 'unarchived'
  | 'manual_bulk_archive'
  | 'job_deleted'
  | 'job_created'
  | 'interview_round_added'
  | 'interview_round_updated'
  | 'interview_round_deleted'

export type AffectedJob = {
  id: string
  company: string
  title: string
}

export type Notification = {
  id: string
  userId: string
  activityLogId: string | null
  jobApplicationId: string | null
  eventType: NotificationEventType
  title: string
  body: string | null
  isLoud: boolean
  isRead: boolean
  readAt: string | null
  linkType: NotificationLinkType
  affectedJobs: AffectedJob[] | null
  createdAt: string
}

// ─── Duplicate Detection ─────────────────────────────────────────────────────

export type DuplicateCheckMatch = {
  id: string;
  company: string;
  title: string;
  status: string;
  savedAt: string;        // ISO date string
  isArchived: boolean;
  archivedAt: string | null;
};

export type DuplicateCheckResult = {
  isDuplicate: boolean;
  matches: DuplicateCheckMatch[];
};

// ─── Interview Rounds ─────────────────────────────────────────────────────────

export type InterviewType =
  | "screening"
  | "technical-phone"
  | "take-home"
  | "coding"
  | "pair-programming"
  | "technical-deep-dive"
  | "system-design"
  | "behavioral"
  | "panel"
  | "final"
  | "other";

export type InterviewRound = {
  id: string;
  jobApplicationId: string;
  roundNumber: number;
  type: InterviewType;
  date?: string;
  location?: string;
  contactName?: string;
  contactRole?: string;
  done: boolean;
  followUpSent: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};
