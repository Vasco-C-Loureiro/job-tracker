# Architecture

## Three-tier overview

```
┌──────────────────────┐   HTTPS    ┌──────────────────────┐   Server-side   ┌──────────────────┐
│       BROWSER        │  ────────▶ │       NEXT.JS        │    queries      │     SUPABASE     │
│  Chrome / Firefox    │            │  (hosted on Vercel)  │  ─────────────▶ │ (managed backend)│
│                      │            │                      │                 │                  │
│  • Plasmo extension  │            │  • API routes        │                 │  • Auth (OAuth)  │
│  • Dashboard UI      │            │  • Pages (App Router)│                 │  • Postgres + RLS│
└──────────────────────┘            └──────────────────────┘                 └──────────────────┘
```

### Why a Next.js middle layer (vs. extension talking directly to Supabase)

1. **Future-proofing.** AI extraction (v3) and third-party enrichment (logos, etc.) require server-side API keys that cannot safely live in a browser extension.
2. **Validation and normalization.** The API can validate incoming payloads, normalize structure, and deduplicate before anything touches the database.
3. **Portfolio value.** "Built a REST API with Next.js Route Handlers backed by Supabase" is a stronger CV line than "called Supabase from the client."

The extension never speaks to Supabase directly. Supabase RLS still applies as defense-in-depth in case the API layer has bugs.

## Tech stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Extension framework** | Plasmo | Hot reload, TypeScript out of box, cross-browser support, file-based structure. Faster dev loop than vanilla MV3 without hiding the underlying APIs. |
| **Extension manifest** | Manifest V3 | Chrome's current standard; mandatory for new extensions. Plasmo abstracts boilerplate but you still touch permissions, content scripts, message passing. |
| **Frontend framework** | Next.js 15 (App Router) | Industry default for React in 2026. Server Components, Server Actions, Route Handlers. Better mention in CVs than Pages Router. |
| **Styling** | Tailwind CSS | Industry default; fast iteration; works well with shadcn/ui later if needed. |
| **Backend** | Next.js Route Handlers | Lives in the same Next.js app under `app/api/`. The endpoints the extension calls over HTTPS. |
| **Database** | Supabase Postgres | Managed Postgres with auth, RLS, full-text search built in. Free tier sufficient for portfolio + early users. |
| **Auth** | Supabase Auth | Email/password + Google OAuth. Free, no MAU limits on OAuth providers. |
| **Hosting (web)** | Vercel | One-click Next.js deploys, free tier, automatic preview deployments per PR. |
| **Hosting (DB/Auth)** | Supabase | Free tier: 500 MB DB, 2 GB bandwidth, generous auth. |
| **Repo structure** | pnpm workspaces monorepo | Single repo for web + extension + shared types; pnpm is faster and disk-efficient. |
| **Language** | TypeScript throughout | Type safety end-to-end; shared types between extension and web via packages/shared. |

## Repo structure

```
job-tracker/
├── apps/
│   ├── web/                # Next.js app (dashboard + API routes + landing)
│   └── extension/          # Plasmo extension
├── packages/
│   └── shared/             # Shared TypeScript types (JobApplication, etc.) and utils
├── package.json            # Root workspace config
├── pnpm-workspace.yaml     # Workspace declaration
├── .gitignore
├── LICENSE                 # MIT
└── README.md
```

**Why monorepo:** the `JobApplication` type and any shared logic lives in `packages/shared/` and is imported by both apps. Single source of truth — changing the schema updates both sides together. One `git clone` for anyone reviewing the project.

## Auth flow (cross-context)

The trickiest part of the architecture: the extension and the dashboard need to share a user session.

### Approach: Option A — popup-based login

1. User signs up on the **dashboard** at `jobtracker.app/signup`. Next.js handles the OAuth redirect, callback, and session creation. Session cookie set on `jobtracker.app`.
2. User clicks "Sign In" in the **extension popup**. Extension opens the dashboard's login page in a new browser tab or popup.
3. After successful login on the dashboard, the extension reads the session via `chrome.cookies` API (requires `cookies` permission in the manifest) or a postMessage handshake initiated by the dashboard.
4. The extension stores a session token in `chrome.storage.local` and attaches it to every API call going forward.

### Why this approach (vs. extension having its own OAuth flow)

- **Single source of truth for auth** — only one login flow to maintain.
- **Cleaner UX** — users only sign up once; the extension piggybacks on the existing dashboard session.
- **Demonstrates cross-context auth** — a genuinely non-trivial engineering concept that hiring managers like to see solved.

## Extraction architecture (layered fallback)

Called in order on every save. First strategy that returns a complete-enough result wins:

1. **JSON-LD structured data.** Many sites expose `<script type="application/ld+json">` with `JobPosting` schema for Google Jobs SEO. Most reliable when available. Always tried first.
2. **Site-specific adapters.** Custom selectors per supported site (Indeed, Greenhouse, Lever in v1.0). One module per site.
3. **Semantic heuristics.** Largest visible `<h1>` for title, nearby Apply button for company, regex for salary patterns, etc. For unknown sites.
4. **AI extraction.** v3+. Send cleaned page text to an LLM, parse structured output. Not in MVP.

Whatever extracts gets normalized to the `JobApplication` schema before save.

## Git conventions

- **Trunk-based development.** One long-lived `main` branch. Feature branches are short-lived (1–3 days) and deleted after merge.
- **Branch naming:** `feat/short-description`, `fix/short-description`, `chore/short-description`, `refactor/short-description`.
- **Conventional commits:** prefixes `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`. Makes git history readable and enables auto-generated changelogs later.
- **PRs for all changes**, even solo work. Forces self-review of diffs and makes the GitHub history look professional.
- **Versions are git tags** (`v0.1.0`, `v1.0.0`), not branches. Long-lived version branches add complexity without benefit for a project with no legacy users to maintain.
- **No layer-based branches.** Features typically touch schema + API + extension + UI together and should ship atomically.
- **Branch protection on `main`:** require PRs, no direct pushes. Builds the habit.

## Dev environment

- **OS:** WSL Ubuntu on Windows (Vasco's setup).
- **Code lives on the Linux side** (`/home/vasco/projects/job-tracker`), never under `/mnt/c/`. Performance, file-watching, symlinks, line endings — all reasons.
- **Editor:** VSCode with the WSL extension installed. Run `code .` from the WSL terminal to open the project with VSCode's WSL backend.
- **Recommended VSCode extensions:** ESLint, Prettier, Tailwind CSS IntelliSense, GitLens, Supabase.
- **Node:** 24 LTS, installed via nvm (not apt).
- **Package manager:** pnpm via Corepack (`corepack enable && corepack prepare pnpm@latest --activate`).

## What's deliberately NOT in the architecture (yet)

- No scraping infrastructure
- No background workers or queues
- No CDN beyond what Vercel provides
- No caching layer (Redis, etc.)
- No analytics tooling (PostHog could come in v2.0)
- No CI/CD pipelines (Vercel deploys on push automatically)
- No monitoring (Sentry comes in v2.0)

All of these can be added later if needed. None are required for v0.1 through v1.5.
