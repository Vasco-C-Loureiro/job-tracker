# Ascend Pro — Job Tracker (CLAUDE.md)

## Project overview
Full-stack job application tracker. Browser extension saves jobs from listing
pages; web dashboard tracks application progress. Portfolio project + personal
daily-use tool. Repo: Vasco-C-Loureiro/job-tracker.

## Monorepo structure
job-tracker/

├── apps/web/          # Next.js 15 App Router — dashboard + API routes

├── apps/extension/    # Plasmo Manifest V3 Chrome extension

└── packages/shared/   # Shared TypeScript types and utilities
Package manager: pnpm workspaces. Node 24 LTS via nvm. Dev environment: WSL
Ubuntu on Windows. Run `code .` from WSL terminal to open in VSCode.

## Dev commands
```bash
pnpm --filter web dev          # Next.js dev server (localhost:3000)
pnpm --filter extension dev    # Plasmo dev server
pnpm --filter shared build     # Rebuild shared package after changes
pnpm --filter web exec tsc --noEmit      # Type-check web
pnpm --filter extension exec tsc --noEmit  # Type-check extension
```
Always rebuild shared before running the extension if shared has changed.

## API route pattern (ALL routes must follow this exactly)
```typescript
// Use service client — never the server client in API routes
import { createSupabaseServiceClient } from '@/lib/supabase/service';

// Validate Bearer token
const token = req.headers.get('authorization')?.replace('Bearer ', '');
if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

const supabase = createSupabaseServiceClient();
const { data: { user }, error } = await supabase.auth.getUser(token);
if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

// Always add manual ownership check — never rely on RLS alone in API routes
const { data } = await supabase
  .from('job_applications')
  .select(...)
  .eq('user_id', user.id);   // ← required on every query
```
Server Components use `createSupabaseServerClient()`. API routes always use
`createSupabaseServiceClient()`.

## Extension auth pattern
JWT stored in `chrome.storage.local` after login. Sent as `Authorization: Bearer
<token>` on every API call. Extension never talks to Supabase directly.

## Database
Supabase project ID: jpioswotsnfebhoyucpo (EU region).
SQL migrations are written as .sql files and run manually in the Supabase SQL
Editor — never executed programmatically by Claude Code.
When creating a new table, add RLS policies immediately — foreign keys do not
inherit protection from the parent table.

## Git rules — READ CAREFULLY

### Authorship — CRITICAL
Every commit must show only Vasco-C-Loureiro as the sole author.
NEVER add Co-authored-by trailers. NEVER add "Generated with Claude Code" or
any Claude attribution anywhere in commit messages or PR descriptions.
Do not use --author flags. This rule has no exceptions.

### Branching
Never commit directly to main. Always work on a feature branch.
Branch naming: feat/u{N}-description (e.g. feat/u23-duplicate-detection)
PR title format: "feat/u{N}: short description"

### Commit messages
Use conventional commits. Every message must be fully descriptive — never just
"fix:" or "feat:" alone. Always write the complete message.
Good: `fix: use solid amber-100 for highlight-pulse so it is visible against white table background`
Bad:  `fix: highlight`

One commit per logical sub-task within a unit.

## Key CSS rules (hard-won, do not repeat these mistakes)
- `box-shadow` does not render on `display: table-row` in Chrome. Animate
  `background-color` on `.highlight-pulse td` instead.
- `border-radius` on `<td>` requires `border-separate border-spacing-0` on the
  table — Tailwind preflight sets `border-collapse: collapse` which silently
  ignores border-radius.
- `table-fixed` creates dead zones when column widths sum to less than table
  width — removing it entirely is cleaner than compensating.
- `ring-1` on `<tr>` solves triangular border gaps at cell junctions.
- CSS animations with semi-transparent colours (e.g. `rgba / 0.2`) can look
  invisible against white backgrounds — use solid colours (e.g. `#fef3c7`).

## Key React / Next.js rules
- `useSearchParams()` must be read inside `useEffect`, not `useState` — on SSR
  it returns null and never updates on hydration if used in useState.
- In Next.js 15 App Router, `searchParams` in Server Components is a Promise
  and must be awaited.

## Prompts written by Claude (planning chat)
Prompts are written in the planning chat and executed sequentially in Claude Code.
Each prompt must be fully self-contained — no placeholder text, no "paste code
here" instructions. All code is embedded directly in the prompt.
