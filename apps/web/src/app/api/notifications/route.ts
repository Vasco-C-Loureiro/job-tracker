import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase.server";
import type { Notification } from "@job-tracker/shared";

const PAGE_SIZE = 25;

function mapRow(row: Record<string, unknown>): Notification {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    activityLogId: row.activity_log_id as string | null,
    jobApplicationId: row.job_application_id as string | null,
    eventType: row.event_type as Notification["eventType"],
    title: row.title as string,
    body: row.body as string | null,
    isLoud: row.is_loud as boolean,
    isRead: row.is_read as boolean,
    readAt: row.read_at as string | null,
    linkType: row.link_type as Notification["linkType"],
    affectedJobs: row.affected_jobs as Notification["affectedJobs"],
    createdAt: row.created_at as string,
  };
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = authHeader.slice(7);
  const supabase = createSupabaseServiceClient();
  const { data: userData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = userData.user.id;

  const pageParam = request.nextUrl.searchParams.get("page");
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (error) {
    console.error("Notifications fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }

  const total = count ?? 0;
  const items = (data ?? []).map((row) => mapRow(row as Record<string, unknown>));

  return NextResponse.json({
    items,
    total,
    hasMore: offset + items.length < total,
  });
}

export async function PATCH(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = authHeader.slice(7);
  const supabase = createSupabaseServiceClient();
  const { data: userData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = userData.user.id;

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

  if (b.all === true) {
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("is_read", false);
  } else if (Array.isArray(b.ids) && b.ids.length > 0) {
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in("id", b.ids)
      .eq("user_id", userId)
      .eq("is_read", false);
  } else {
    return NextResponse.json(
      { error: "Body must contain 'all: true' or a non-empty 'ids' array" },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = authHeader.slice(7);
  const supabase = createSupabaseServiceClient();
  const { data: userData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = userData.user.id;

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

  if (!Array.isArray(b.ids) || b.ids.length === 0) {
    return NextResponse.json({ error: "Body must contain a non-empty 'ids' array" }, { status: 400 });
  }

  const { error } = await supabase
    .from("notifications")
    .delete()
    .in("id", b.ids)
    .eq("user_id", userId);

  if (error) {
    console.error("Notification delete error:", error);
    return NextResponse.json({ error: "Failed to delete notifications" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
