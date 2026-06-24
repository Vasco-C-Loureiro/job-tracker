import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase.server";
import type { CalendarFeedEvent, InterviewType } from "@job-tracker/shared";
import { roundTitle, appliedTitle, deadlineTitle } from "@/lib/calendar/labels";

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseServiceClient();
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const events: CalendarFeedEvent[] = [];

  // ── 1. Manual calendar events ─────────────────────────────────────────────
  try {
    const { data, error } = await supabase
      .from("calendar_events")
      .select("id, title, date, time, end_time, description, color")
      .eq("user_id", user.id);

    if (error) {
      console.error("[calendar-feed] manual events error:", error.message);
    } else {
      for (const row of data ?? []) {
        events.push({
          id: row.id,
          source: "manual",
          title: row.title,
          date: (row.date as string).substring(0, 10),
          time: row.time ? row.time.slice(0, 5) : null,
          endTime: row.end_time ? row.end_time.slice(0, 5) : null,
          description: row.description ?? null,
          color: row.color ?? null,
          roundType: null,
          roundNumber: null,
          jobId: null,
          roundId: null,
          eventId: row.id,
          company: null,
          jobTitle: null,
          salary: null,
          interestLevel: null,
        });
      }
    }
  } catch (err) {
    console.error("[calendar-feed] manual events exception:", err);
  }

  // ── 2. Interview rounds with a date set ───────────────────────────────────
  try {
    const { data, error } = await supabase
      .from("interview_rounds")
      .select("id, job_application_id, round_number, type, date, time, job_applications!inner(user_id, company, title)")
      .eq("job_applications.user_id", user.id)
      .not("date", "is", null);

    if (error) {
      console.error("[calendar-feed] interview rounds error:", error.message);
    } else {
      for (const row of data ?? []) {
        const app = row.job_applications as unknown as { user_id: string; company: string; title: string };
        events.push({
          id: row.id,
          source: "interview_round",
          title: roundTitle(row.round_number, row.type as InterviewType),
          date: (row.date as string).substring(0, 10),
          time: row.time ? (row.time as string).slice(0, 5) : null,
          endTime: null,
          description: null,
          color: null,
          roundType: row.type as InterviewType,
          roundNumber: row.round_number,
          jobId: row.job_application_id,
          roundId: row.id,
          eventId: null,
          company: app.company,
          jobTitle: app.title,
          salary: null,
          interestLevel: null,
        });
      }
    }
  } catch (err) {
    console.error("[calendar-feed] interview rounds exception:", err);
  }

  // ── 3. Deadline events (closing_date) ────────────────────────────────────
  try {
    const { data, error } = await supabase
      .from("job_applications")
      .select("id, company, title, closing_date, interest_level, salary_raw")
      .eq("user_id", user.id)
      .not("closing_date", "is", null)
      .eq("is_archived", false);

    if (error) {
      console.error("[calendar-feed] deadline events error:", error.message);
    } else {
      for (const row of data ?? []) {
        events.push({
          id: `deadline:${row.id}`,
          source: "deadline",
          title: deadlineTitle(row.company),
          date: (row.closing_date as string).substring(0, 10),
          time: null,
          endTime: null,
          description: null,
          color: null,
          roundType: null,
          roundNumber: null,
          jobId: row.id,
          roundId: null,
          eventId: null,
          company: row.company,
          jobTitle: (row.title as string) ?? null,
          salary: (row.salary_raw as string) ?? null,
          interestLevel: (row.interest_level as CalendarFeedEvent["interestLevel"]) ?? null,
        });
      }
    }
  } catch (err) {
    console.error("[calendar-feed] deadline events exception:", err);
  }

  // ── 4. Applied dates (preference-gated) ───────────────────────────────────
  try {
    const { data: prefs } = await supabase
      .from("user_preferences")
      .select("show_applied_dates")
      .eq("user_id", user.id)
      .maybeSingle();

    if (prefs?.show_applied_dates) {
      const { data, error } = await supabase
        .from("job_applications")
        .select("id, company, title, applied_at, salary_raw, interest_level")
        .eq("user_id", user.id)
        .not("applied_at", "is", null)
        .eq("is_archived", false);

      if (error) {
        console.error("[calendar-feed] applied dates error:", error.message);
      } else {
        for (const row of data ?? []) {
          const dateStr = (row.applied_at as string).substring(0, 10);
          events.push({
            id: `applied:${row.id}`,
            source: "applied",
            title: appliedTitle(row.company),
            date: dateStr,
            time: null,
            endTime: null,
            description: null,
            color: null,
            roundType: null,
            roundNumber: null,
            jobId: row.id,
            roundId: null,
            eventId: null,
            company: row.company,
            jobTitle: (row.title as string) ?? null,
            salary: (row.salary_raw as string) ?? null,
            interestLevel: (row.interest_level as CalendarFeedEvent["interestLevel"]) ?? null,
          });
        }
      }
    }
  } catch (err) {
    console.error("[calendar-feed] applied dates exception:", err);
  }

  // Sort: date asc, then timed events before untimed within the same day
  events.sort((a, b) => {
    if (a.date < b.date) return -1;
    if (a.date > b.date) return 1;
    if (a.time && !b.time) return -1;
    if (!a.time && b.time) return 1;
    if (a.time && b.time) return a.time.localeCompare(b.time);
    return 0;
  });

  return NextResponse.json({ events });
}
