import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase.server";
import { DEFAULT_VISIBLE_COLUMNS } from "@/lib/column-preferences";

type PreferencesRow = {
  user_id: string;
  // U20 columns
  visible_columns: string[] | null;
  skip_bulk_delete_warning: boolean | null;
  skip_bulk_archive_warning: boolean | null;
  default_resume_submitted: boolean | null;
  default_cover_letter_submitted: boolean | null;
  // U21 columns
  auto_archive_inactive_enabled: boolean | null;
  auto_archive_inactive_days: number | null;
  auto_archive_rejected_enabled: boolean | null;
  auto_archive_rejected_days: number | null;
};

const DEFAULTS = {
  visible_columns: DEFAULT_VISIBLE_COLUMNS,
  skip_bulk_delete_warning: false,
  skip_bulk_archive_warning: false,
  default_resume_submitted: true,
  default_cover_letter_submitted: false,
  autoArchiveInactiveEnabled: true,
  autoArchiveInactiveDays: 30,
  autoArchiveRejectedEnabled: true,
  autoArchiveRejectedDays: 7,
};

function buildResponse(row: PreferencesRow) {
  return {
    visible_columns: row.visible_columns ?? DEFAULT_VISIBLE_COLUMNS,
    skip_bulk_delete_warning: row.skip_bulk_delete_warning ?? false,
    skip_bulk_archive_warning: row.skip_bulk_archive_warning ?? false,
    default_resume_submitted: row.default_resume_submitted ?? true,
    default_cover_letter_submitted: row.default_cover_letter_submitted ?? false,
    autoArchiveInactiveEnabled: row.auto_archive_inactive_enabled ?? true,
    autoArchiveInactiveDays: row.auto_archive_inactive_days ?? 30,
    autoArchiveRejectedEnabled: row.auto_archive_rejected_enabled ?? true,
    autoArchiveRejectedDays: row.auto_archive_rejected_days ?? 7,
  };
}

const SELECT_COLS =
  "user_id, visible_columns, skip_bulk_delete_warning, skip_bulk_archive_warning, " +
  "default_resume_submitted, default_cover_letter_submitted, " +
  "auto_archive_inactive_enabled, auto_archive_inactive_days, " +
  "auto_archive_rejected_enabled, auto_archive_rejected_days";

function getToken(request: NextRequest): string | null {
  const h = request.headers.get("Authorization");
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice(7);
}

async function authenticate(request: NextRequest) {
  const token = getToken(request);
  if (!token) return null;
  const supabase = createSupabaseServiceClient();
  const { data: userData, error } = await supabase.auth.getUser(token);
  if (error || !userData.user) return null;
  return { supabase, userId: userData.user.id };
}

export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { supabase, userId } = auth;

  const { data } = await supabase
    .from("user_preferences")
    .select(SELECT_COLS)
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return NextResponse.json(DEFAULTS);

  return NextResponse.json(buildResponse(data as unknown as PreferencesRow));
}

export async function PUT(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { supabase, userId } = auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Body must be a JSON object" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const upsert: Record<string, unknown> = {
    user_id: userId,
    updated_at: new Date().toISOString(),
  };

  // ── U20 fields (snake_case in body → snake_case in DB) ──────────────────────

  if ("visible_columns" in b) {
    if (!Array.isArray(b.visible_columns) || !b.visible_columns.every((c) => typeof c === "string")) {
      return NextResponse.json({ error: "visible_columns must be string[]" }, { status: 400 });
    }
    upsert.visible_columns = b.visible_columns;
  }

  if ("skip_bulk_delete_warning" in b) {
    if (typeof b.skip_bulk_delete_warning !== "boolean") {
      return NextResponse.json({ error: "skip_bulk_delete_warning must be boolean" }, { status: 400 });
    }
    upsert.skip_bulk_delete_warning = b.skip_bulk_delete_warning;
  }

  if ("skip_bulk_archive_warning" in b) {
    if (typeof b.skip_bulk_archive_warning !== "boolean") {
      return NextResponse.json({ error: "skip_bulk_archive_warning must be boolean" }, { status: 400 });
    }
    upsert.skip_bulk_archive_warning = b.skip_bulk_archive_warning;
  }

  if ("default_resume_submitted" in b) {
    if (typeof b.default_resume_submitted !== "boolean") {
      return NextResponse.json({ error: "default_resume_submitted must be boolean" }, { status: 400 });
    }
    upsert.default_resume_submitted = b.default_resume_submitted;
  }

  if ("default_cover_letter_submitted" in b) {
    if (typeof b.default_cover_letter_submitted !== "boolean") {
      return NextResponse.json({ error: "default_cover_letter_submitted must be boolean" }, { status: 400 });
    }
    upsert.default_cover_letter_submitted = b.default_cover_letter_submitted;
  }

  // ── U21 fields (camelCase in body → snake_case in DB) ──────────────────────

  if ("autoArchiveInactiveEnabled" in b) {
    if (typeof b.autoArchiveInactiveEnabled !== "boolean") {
      return NextResponse.json(
        { error: "autoArchiveInactiveEnabled must be a boolean" },
        { status: 400 },
      );
    }
    upsert.auto_archive_inactive_enabled = b.autoArchiveInactiveEnabled;
  }

  if ("autoArchiveInactiveDays" in b) {
    if (
      typeof b.autoArchiveInactiveDays !== "number" ||
      !Number.isInteger(b.autoArchiveInactiveDays) ||
      b.autoArchiveInactiveDays < 1
    ) {
      return NextResponse.json(
        { error: "autoArchiveInactiveDays must be a positive integer" },
        { status: 400 },
      );
    }
    upsert.auto_archive_inactive_days = b.autoArchiveInactiveDays;
  }

  if ("autoArchiveRejectedEnabled" in b) {
    if (typeof b.autoArchiveRejectedEnabled !== "boolean") {
      return NextResponse.json(
        { error: "autoArchiveRejectedEnabled must be a boolean" },
        { status: 400 },
      );
    }
    upsert.auto_archive_rejected_enabled = b.autoArchiveRejectedEnabled;
  }

  if ("autoArchiveRejectedDays" in b) {
    if (
      typeof b.autoArchiveRejectedDays !== "number" ||
      !Number.isInteger(b.autoArchiveRejectedDays) ||
      b.autoArchiveRejectedDays < 1
    ) {
      return NextResponse.json(
        { error: "autoArchiveRejectedDays must be a positive integer" },
        { status: 400 },
      );
    }
    upsert.auto_archive_rejected_days = b.autoArchiveRejectedDays;
  }

  const { data, error } = await supabase
    .from("user_preferences")
    .upsert(upsert, { onConflict: "user_id" })
    .select(SELECT_COLS)
    .maybeSingle();

  if (error) {
    console.error("Preferences upsert error:", error);
    return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
  }

  return NextResponse.json(data ? buildResponse(data as unknown as PreferencesRow) : DEFAULTS);
}
