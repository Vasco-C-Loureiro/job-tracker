import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase.server";

type PreferencesRow = {
  user_id: string;
  auto_archive_inactive_enabled: boolean;
  auto_archive_inactive_days: number;
  auto_archive_rejected_enabled: boolean;
  auto_archive_rejected_days: number;
};

const DEFAULTS = {
  autoArchiveInactiveEnabled: true,
  autoArchiveInactiveDays: 30,
  autoArchiveRejectedEnabled: true,
  autoArchiveRejectedDays: 7,
};

function rowToResponse(row: PreferencesRow) {
  return {
    autoArchiveInactiveEnabled: row.auto_archive_inactive_enabled,
    autoArchiveInactiveDays: row.auto_archive_inactive_days,
    autoArchiveRejectedEnabled: row.auto_archive_rejected_enabled,
    autoArchiveRejectedDays: row.auto_archive_rejected_days,
  };
}

const SELECT_COLS =
  "user_id, auto_archive_inactive_enabled, auto_archive_inactive_days, " +
  "auto_archive_rejected_enabled, auto_archive_rejected_days";

async function authenticate(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
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

  return NextResponse.json(rowToResponse(data as unknown as PreferencesRow));
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
  const upsert: Record<string, unknown> = { user_id: userId };

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

  return NextResponse.json(data ? rowToResponse(data as unknown as PreferencesRow) : DEFAULTS);
}
