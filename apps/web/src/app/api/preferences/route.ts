import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase.server";

type PrefsRow = {
  visible_columns: string[] | null;
  skip_bulk_delete_warning: boolean | null;
  skip_bulk_archive_warning: boolean | null;
  default_resume_submitted: boolean | null;
  default_cover_letter_submitted: boolean | null;
};

export const DEFAULT_VISIBLE_COLUMNS = [
  "company", "title", "status",
  "jobType", "remoteType", "location", "salaryRaw",
  "interestLevel", "appliedAt", "resumeCoverLetter", "sourceUrl",
];

const DEFAULT_PREFS = {
  visible_columns: DEFAULT_VISIBLE_COLUMNS,
  skip_bulk_delete_warning: false,
  skip_bulk_archive_warning: false,
  default_resume_submitted: true,
  default_cover_letter_submitted: false,
};

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
    .select(
      "visible_columns, skip_bulk_delete_warning, skip_bulk_archive_warning, " +
      "default_resume_submitted, default_cover_letter_submitted",
    )
    .eq("user_id", userId)
    .maybeSingle() as { data: PrefsRow | null };

  if (!data) return NextResponse.json(DEFAULT_PREFS);

  return NextResponse.json({
    visible_columns: data.visible_columns ?? DEFAULT_VISIBLE_COLUMNS,
    skip_bulk_delete_warning: data.skip_bulk_delete_warning ?? false,
    skip_bulk_archive_warning: data.skip_bulk_archive_warning ?? false,
    default_resume_submitted: data.default_resume_submitted ?? true,
    default_cover_letter_submitted: data.default_cover_letter_submitted ?? false,
  });
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
  const update: Record<string, unknown> = {
    user_id: userId,
    updated_at: new Date().toISOString(),
  };

  if ("visible_columns" in b) {
    if (!Array.isArray(b.visible_columns) || !b.visible_columns.every((c) => typeof c === "string")) {
      return NextResponse.json({ error: "visible_columns must be string[]" }, { status: 400 });
    }
    update.visible_columns = b.visible_columns;
  }

  if ("skip_bulk_delete_warning" in b) {
    if (typeof b.skip_bulk_delete_warning !== "boolean") {
      return NextResponse.json({ error: "skip_bulk_delete_warning must be boolean" }, { status: 400 });
    }
    update.skip_bulk_delete_warning = b.skip_bulk_delete_warning;
  }

  if ("skip_bulk_archive_warning" in b) {
    if (typeof b.skip_bulk_archive_warning !== "boolean") {
      return NextResponse.json({ error: "skip_bulk_archive_warning must be boolean" }, { status: 400 });
    }
    update.skip_bulk_archive_warning = b.skip_bulk_archive_warning;
  }

  if ("default_resume_submitted" in b) {
    if (typeof b.default_resume_submitted !== "boolean") {
      return NextResponse.json({ error: "default_resume_submitted must be boolean" }, { status: 400 });
    }
    update.default_resume_submitted = b.default_resume_submitted;
  }

  if ("default_cover_letter_submitted" in b) {
    if (typeof b.default_cover_letter_submitted !== "boolean") {
      return NextResponse.json({ error: "default_cover_letter_submitted must be boolean" }, { status: 400 });
    }
    update.default_cover_letter_submitted = b.default_cover_letter_submitted;
  }

  const { data, error } = await supabase
    .from("user_preferences")
    .upsert(update, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    console.error("Supabase upsert error:", error);
    return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}
