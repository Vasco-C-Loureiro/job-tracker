import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase.server";
import type { Notification } from "@job-tracker/shared";

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

  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .eq("is_read", false)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("Unread notifications fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch unread notifications" }, { status: 500 });
  }

  return NextResponse.json({
    unreadCount: count ?? 0,
    items: (data ?? []).map((row) => mapRow(row as Record<string, unknown>)),
  });
}
