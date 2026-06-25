import { NextRequest, NextResponse } from 'next/server';
import { normalizeUrl } from '@job-tracker/shared';
import type { DuplicateCheckResult } from '@job-tracker/shared';
import { createSupabaseServiceClient } from '@/lib/supabase.server';

export async function POST(req: NextRequest) {
  // ── Auth — same pattern as all other API routes ───────────────────────────
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = user.id;

  // ── Input parsing and validation ──────────────────────────────────────────
  let body: { url?: unknown; title?: unknown; company?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const rawUrl = typeof body.url === 'string' ? body.url.trim() : '';
  const rawTitle = typeof body.title === 'string' ? body.title.trim().slice(0, 500) : '';
  const rawCompany = typeof body.company === 'string' ? body.company.trim().slice(0, 500) : '';

  if (!rawUrl) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  try {
    new URL(rawUrl); // rejects non-URL strings
  } catch {
    return NextResponse.json({ error: 'url must be a valid URL' }, { status: 400 });
  }

  const normalizedUrl = normalizeUrl(rawUrl);

  // ── Queries — run in parallel ─────────────────────────────────────────────
  type DuplicateRow = {
    id: string;
    company: string;
    title: string;
    status: string;
    saved_at: string;
    is_archived: boolean;
    archived_at: string | null;
  };

  const FIELDS = 'id, company, title, status, saved_at, is_archived, archived_at';

  // Query 1: URL match — hits the (user_id, source_url_normalized) index
  const urlMatchPromise = supabase
    .from('job_applications')
    .select(FIELDS)
    .eq('user_id', userId)
    .eq('source_url_normalized', normalizedUrl)
    .limit(3);

  // Query 2: title + company text match — only when both values are present
  const textMatchPromise =
    rawTitle && rawCompany
      ? supabase
          .from('job_applications')
          .select(FIELDS)
          .eq('user_id', userId)
          .ilike('title', rawTitle)
          .ilike('company', rawCompany)
          .limit(3)
      : Promise.resolve({ data: [] as DuplicateRow[], error: null });

  const [urlResult, textResult] = await Promise.all([urlMatchPromise, textMatchPromise]);

  if (urlResult.error) {
    console.error('[duplicate-check] url query error:', urlResult.error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
  if (textResult.error) {
    console.error('[duplicate-check] text query error:', textResult.error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  // Merge results, deduplicate by ID, cap at 3 total
  const seen = new Set<string>();
  const matches: DuplicateCheckResult['matches'] = [];

  for (const row of [...(urlResult.data ?? []), ...(textResult.data ?? [])]) {
    if (seen.has(row.id) || matches.length >= 3) continue;
    seen.add(row.id);
    matches.push({
      id: row.id,
      company: row.company,
      title: row.title,
      status: row.status,
      savedAt: row.saved_at,
      isArchived: row.is_archived ?? false,
      archivedAt: row.archived_at ?? null,
    });
  }

  return NextResponse.json({
    isDuplicate: matches.length > 0,
    matches,
  } satisfies DuplicateCheckResult);
}
