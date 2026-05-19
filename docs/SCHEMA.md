# Schema

The data model uses two tables (`job_applications` and `interview_rounds`) plus one embedded sub-object (`offer`). Types shown in TypeScript notation; these become Postgres tables.

## Tables

### `job_applications` (main table)

```ts
type JobApplication = {
  id: string                    // uuid, primary key
  userId: string                // foreign key to auth.users

  // ───── Extracted fields (editable in save-popup) ─────
  company: string
  title: string
  location?: string
  remoteType?: "remote" | "hybrid" | "onsite"
  jobType?:
    | "full-time"
    | "part-time"
    | "contract"
    | "internship"
    | "graduate"
    | "fixed-term"
  experienceLevel?:
    | "intern"
    | "junior"
    | "mid"
    | "senior"
    | "lead"
    | "unspecified"
  salary?: string               // free text — often "Competitive" or "N/A"
  closingDate?: Date            // often missing; deprioritized in UI
  description?: string          // cleaned plaintext/markdown, NOT raw HTML
  sourceUrl: string             // where the listing was found
  source: string                // auto-detected: "indeed", "greenhouse", etc.
  companyLogoUrl?: string       // auto-fetched (favicon API or Clearbit)

  // ───── User-managed fields ─────
  status:
    | "saved"
    | "applied"
    | "oa"                      // online assessment
    | "interview"
    | "rejected"
    | "offer"
    | "ghosted"                 // recruiter never replied (NOT "ghost listing")
  companyApplicationUrl?: string  // user-entered direct application URL
  resumeSubmitted: boolean
  coverLetterSubmitted: boolean
  interestLevel?: "low" | "medium" | "high" | "very-high"
  tags?: string[]               // user-set in v1.0, AI-suggested in v2+
  notes?: string
  appliedAt?: Date              // user fills in, or auto-set when status="applied"

  // ───── Embedded sub-object ─────
  offer?: OfferDetails

  // ───── Auto-populated ─────
  savedAt: Date                 // set when extension save is clicked
  updatedAt: Date
}
```

### `interview_rounds` (separate table, one-to-many with job_applications)

```ts
type InterviewRound = {
  id: string                    // uuid, primary key
  jobApplicationId: string      // foreign key → JobApplication.id
  roundNumber: number           // 1, 2, 3, … user-determined; unlimited
  type: InterviewType
  date?: Date
  location?: string             // "Online (Recorded)", physical address, etc.
  contactName?: string
  contactRole?: string
  done: boolean
  followUpSent: boolean
  notes?: string
}

type InterviewType =
  | "screening"            // recruiter / HR phone call
  | "technical-phone"      // technical screening
  | "take-home"            // assignment
  | "coding"               // solo live coding
  | "pair-programming"     // collaborative coding with interviewer
  | "technical-deep-dive"  // project walkthrough / experience interview
  | "system-design"        // architecture / system design
  | "behavioral"           // behavioral / values
  | "panel"                // multiple interviewers at once
  | "final"                // final round / onsite
  | "other"
```

**Why a separate table** (not an embedded JSON array): enables queries like "all interviews this week across all jobs" and "screening-to-onsite conversion rate." A calendar view of upcoming interviews is a planned v1.5 feature that benefits directly from this.

### `OfferDetails` (embedded on JobApplication, not a separate table)

```ts
type OfferDetails = {
  dateReceived: Date
  responseDueDate?: Date
  proposedStartDate?: Date
  salary?: string
  annualBonus?: string
  paidHolidays?: string
  otherBenefits?: string
  notes?: string
}
```

**Why embedded:** most jobs have at most one offer. Multi-offer negotiation rounds can live in `notes` for now; revisit if a real use case emerges.

## Key schema decisions and rationale

### Two URL fields, two purposes
- `sourceUrl` — where the listing was found (Indeed, LinkedIn, etc.). Extracted by the extension.
- `companyApplicationUrl` — direct application URL on the company's careers page, often manually entered by the user after they apply through the company site directly. Companies often respond better to direct applications.

### Two date fields, two purposes
- `savedAt` — automatic. Set when the extension save button is clicked.
- `appliedAt` — user-managed. Filled in when actually applying, or auto-set when `status` flips to "applied."

The dashboard shows `appliedAt` by default; `savedAt` becomes a toggleable column in v1.5.

### Status vs interview rounds
`status` is the current overall stage (one of seven enum values). `interview_rounds` records the detailed history. The status enum includes "ghosted" — meaning the recruiter never replied, distinct from the future v2.5 concept of a "ghost listing" (a fake job posting).

### Description storage
Store cleaned plaintext or markdown, NOT raw HTML.
- Raw HTML is bigger, fragile, and full of irrelevant markup.
- Plaintext compresses to ~3-8 KB per row in PostgreSQL (TOAST compression). 500 MB Supabase free tier holds 50,000+ descriptions.
- **Why store at all:** job listings disappear after they close. Users need the description for interview prep weeks later.

### Source auto-detection
When the extension saves from `greenhouse.io`, `source = "greenhouse"`. User never fills this. Auto-detected from hostname.

### Full-text search
A PostgreSQL `tsvector` index on `description` enables "find all jobs mentioning React." Free on Supabase; we set this up at table-creation time (cheap upfront, expensive to add later).

## Field categories: extracted vs user-managed

This distinction matters for both the extension's save-popup and the dashboard UI:

- **Extracted fields** appear in the save-popup pre-filled and editable. The extension does best-effort extraction; the user can correct before saving.
- **User-managed fields** default to sensible values (`status: "saved"`, `resumeSubmitted: false`, etc.) and are edited in the dashboard, not the popup.

## Row Level Security (RLS)

Every table has RLS policies enforcing `userId` match. Even though API requests go through the Next.js server (which uses a service role key), RLS provides defense-in-depth against bugs.
