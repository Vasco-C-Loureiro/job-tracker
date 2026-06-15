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

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseServiceClient();
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");

  let query = supabase
    .from("calendar_events")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: true })
    .order("time", { ascending: true, nullsFirst: true });

  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);

  const { data, error } = await query.returns<CalendarEventRow[]>();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ events: (data ?? []).map(rowToEvent) });
}
