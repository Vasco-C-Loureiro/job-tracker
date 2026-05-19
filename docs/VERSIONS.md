# Version roadmap

The realistic plan: v0.1 through v1.5 is the actual roadmap. v2.0 onward is "if the project still has energy and Vasco wants to keep building."

---

## v0.1 — Skeleton (3–5 days)

**Goal:** prove the pipeline works end-to-end.

- Extension on Indeed only
- "Save Job" button extracts title + company + URL only (minimal subset of schema)
- Job lands in Supabase
- Bare dashboard table shows saved jobs
- No styling, no auth (single hardcoded user), no popup preview, no extraction layering

**Pass criteria:** click button on an Indeed page → row appears in Supabase → row shows in dashboard table.

---

## v1.0 — MVP (2–4 weeks part-time)

**Goal:** replace Vasco's current spreadsheet.

- Extension works on Indeed + Greenhouse + Lever
- Full schema extraction (JSON-LD first, site adapters, semantic heuristics)
- Honey-style preview popup with editable fields before final save
- Dashboard:
  - Table view with all key columns
  - Status updates, notes, basic filtering, basic search
  - Manual edit of any field
  - Tag management (user-set, no AI suggestions yet)
- Auth: email/password + Google OAuth via Supabase
- Multi-device session support (works on desktop and laptop)
- Company logos auto-fetched
- CSV import for existing spreadsheet data
- Landing page (minimal)

**Pass criteria:** Vasco stops using his spreadsheet for new applications.

---

## v1.5 — Daily-use polish (1–2 weeks)

**Goal:** the app is genuinely pleasant to use every day.

- Toggleable dashboard columns (show/hide fields per user preference)
- Kanban view (alternative to table; columns = status)
- Calendar view of upcoming interviews (uses `interview_rounds` table)
- Duplicate detection on save ("you already have this job — view existing?")
- Sortable columns
- Bulk actions (e.g. mark 5 jobs as "ghosted" at once)
- Better empty states, loading states, error states
- Keyboard shortcuts

---

## v2.0 — Public launch (2–4 weeks)

**Goal:** the app is usable by people other than Vasco.

- Landing page with marketing copy, screenshots, sign-up CTA
- Signup flow with onboarding tutorial
- LinkedIn support (the hard one — fragile, expect ongoing maintenance)
- Workday support
- Robust extraction error handling and user-friendly fallbacks
- Production-grade error monitoring (Sentry or similar)
- Public GitHub repo, polished README, demo video
- Firefox build of the extension via Plasmo's cross-browser support

---

## v2.5 — Ghost job detection (data-dependent)

**Goal:** real differentiation from Huntr/Teal.

- Track repost frequency per listing (URL + company hash)
- "This job has been reposted 4 times in 6 months" warnings
- Response-rate statistics per company (applied → first reply)
- Time-to-close metrics for visible listings
- Confidence score for "is this listing real"

Requires sufficient cross-user data — likely months after public launch.

---

## v3.0 — AI features (optional)

**Goal:** added utility, possible paid tier.

- CV tailoring suggestions against a specific JD
- Cover letter draft generation
- Interview question generation based on JD + company info
- Skill gap analysis ("you have 70% of the requirements")
- Auto-suggested tags

All on-demand (user-triggered), never background processing. Cost-controlled.

---

## v4.0 — Integrations (optional)

**Goal:** ecosystem fit.

- Gmail integration: auto-detect rejection/interview emails → update status
- Calendar integration: interview reminders synced to Google Calendar
- LinkedIn profile import for tag suggestions
- Slack notifications for status changes

---

## Versioning convention

- Versions are tracked as **git tags** (`v0.1.0`, `v1.0.0`, etc.), not branches.
- Tag `main` when a version is feature-complete.
- Patch releases (`v1.0.1`) for bug fixes between minor versions.
