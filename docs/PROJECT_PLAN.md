# Job Application Tracker — Project Plan

## What this is

A browser extension plus web dashboard that lets the user save and track job applications from job listing pages (Indeed, Greenhouse, Lever, eventually LinkedIn and Workday) with a single click. Manually-triggered saves only — no scraping, no automation.

Conceptually: a personal Job Application CRM / Career Tracker.

## Goals (in priority order)

1. **Portfolio piece** — demonstrate end-to-end full-stack engineering for junior/grad developer roles in the UK. The project should be presentable on a CV and show the technologies and patterns hiring managers care about.
2. **Personal use** — replace Vasco's current manual spreadsheet tracker. Save real time over weeks of job hunting.
3. **Maybe ship** — once core features work, a public launch is on the table if energy remains. Not a primary goal.

## Core philosophy

- **Stable core first, enhancements later.** Extension + database are the source of truth. Scrapers, AI, and APIs are optional enhancements that should never be critical dependencies.
- **Manual save click.** Acts as anti-bot protection, legal/safety simplification, and a reliability mechanism. Sidesteps the maintenance treadmill of scraping infrastructure.
- **Resilient layered extraction.** Never rely on a single fragile strategy. JSON-LD first → site-specific adapters → semantic heuristics → AI fallback (future).
- **Honey-style preview.** When the user clicks save, show a popup with the extracted data that's editable before final commit. Handles imperfect extraction gracefully.

## What's in MVP (v1.0)

- Browser extension with "Save Job" button
- Extraction for Indeed, Greenhouse, Lever (LinkedIn deferred — too hostile to extensions)
- Web dashboard with table view, status updates, notes, basic filtering, search
- Authentication: email/password + Google OAuth via Supabase
- Edit-on-save preview popup
- Schema covers job metadata, application tracking, interview rounds, offer details
- CSV import for existing spreadsheet data

## What's NOT in MVP

- AI extraction or generation
- Ghost job detection (needs cross-user data we don't have yet)
- LinkedIn / Workday extractors
- Email or calendar integrations
- Kanban view, calendar view, advanced analytics
- Mobile app
- Multi-language support

These move to later versions (see VERSIONS.md).

## Target user / use context

- Primary user: Vasco
- Job market: UK junior/graduate full-stack engineering roles
- Common platforms in target market: Indeed UK, Greenhouse, Lever, some Workday
- Common job types: graduate schemes, junior developer, internships

## Comparable products

- **Huntr** — closest competitor. Established, polished, freemium pricing.
- **Teal** — similar, marketing-heavy.

**Differentiation lever** (long-term, not MVP): **ghost job detection.** Tracking repost patterns, response rates, and time-to-close to surface listings that aren't real. Neither Huntr nor Teal does this meaningfully. Likely a v2.5 feature once enough cross-user data exists.

## Engineering skills this project demonstrates

- Frontend (React, Tailwind, Next.js App Router with Server Components)
- Backend (Next.js Route Handlers, REST API design)
- Database (PostgreSQL schema design, RLS policies, full-text search)
- Authentication (multi-provider OAuth, cross-context session sharing)
- Browser extension APIs (Manifest V3, content scripts, message passing)
- Monorepo management (pnpm workspaces)
- TypeScript throughout the stack
- Resilient extraction patterns and adapter architecture
- Product thinking (what to build, what to defer)

## "When does this become useful" — the v0.1 north star

Vasco confirmed the core test of usefulness: **one click on a job page → all the listing's info ends up in a structured store.** That's the only feature that absolutely has to work. Everything else (statuses, notes, filters, kanban, AI) is decoration around that core loop.

v0.1 exists to prove that loop works end-to-end. Once it does, every later feature is "add a field," "add a page," or "improve the extractor."

## Current status

- All planning complete: schema locked, version roadmap defined, architecture finalized.
- GitHub repo created at `Vasco-C-Loureiro/job-tracker` (private).
- Local clone at `~/projects/job-tracker` (WSL Linux home directory).
- Next step: scaffold the pnpm monorepo structure (apps/web, apps/extension, packages/shared).
