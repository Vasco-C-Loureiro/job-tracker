import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase.server";
import type { CalendarEvent } from "@job-tracker/shared";

type CalendarEventRow = {
  id: string;
  user_id: string;
  title: string;
  date: string;
  time: string | null;
  end_time: string | null;
  description: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
};

function rowToEvent(row: CalendarEventRow): CalendarEvent {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    date: row.date,
    time: row.time,
    endTime: row.end_time,
    description: row.description,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseServiceClient();
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    title?: string;
    date?: string;
    time?: string | null;
    endTime?: string | null;
    description?: string | null;
    color?: string | null;
  };

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if ("title" in body) update.title = body.title;
  if ("date" in body) update.date = body.date;
  if ("time" in body) update.time = body.time ?? null;
  if ("endTime" in body) update.end_time = body.endTime ?? null;
  if ("description" in body) update.description = body.description ?? null;
  if ("color" in body) update.color = body.color ?? null;

  const { data, error } = await supabase
    .from("calendar_events")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error?.code === "PGRST116" || data === null) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(rowToEvent(data as CalendarEventRow));
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseServiceClient();
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error?.code === "PGRST116" || data === null) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
